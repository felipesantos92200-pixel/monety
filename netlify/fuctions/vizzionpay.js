// ========================================
// BIBLIOTECA VIZZIONPAY - API CLIENT
// ========================================
// Funções genéricas para integração com VizzionPay adaptadas para Netlify Functions

const axios = require('axios');

// Definição da Base URL correta da API
const VIZZION_BASE_URL = process.env.VIZZION_BASE_URL || 'https://app.vizzionpay.com/api/v1';

// Lógica para definir a Base URL do site (Produção vs Localhost Netlify)
const SITE_URL = process.env.URL || 'http://localhost:8888';

// Criação da instância configurada do Axios
const apiClient = axios.create({
  baseURL: VIZZION_BASE_URL,
  timeout: 30000, // Timeout de 30 segundos (configurado para serverless)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Helper para validar se as chaves existem antes de chamar a API
 * Injeta os headers dinamicamente para garantir compatibilidade Serverless.
 */
function validarCredenciais() {
  const publicKey = process.env.VIZZION_PUBLIC_KEY;
  const secretKey = process.env.VIZZION_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error('As variáveis VIZZION_PUBLIC_KEY e/ou VIZZION_SECRET_KEY não estão definidas no ambiente da Netlify.');
  }

  // Define os headers de autenticação na instância do axios
  apiClient.defaults.headers.common['x-public-key'] = publicKey;
  apiClient.defaults.headers.common['x-secret-key'] = secretKey;
}

/**
 * Criar pagamento PIX na VizzionPay
 * @param {Object} data - { amount, userId, userName, description }
 * @returns {Promise<Object>} - { pixCode, qrImage, transactionId }
 */
async function criarPagamentoPIX(data) {
  validarCredenciais();
  const { amount, userId, userName, description } = data;

  // Definição da Callback URL com fallback para local
  const callbackUrl = `${SITE_URL}/.netlify/functions/webhook-payment`;

  // Montagem do Payload
  const payload = {
    amount: parseFloat(amount), // Garante que seja número/float
    description: description || `Depósito Monety - ${userName}`,
    customer: {
      name: userName,
      external_id: String(userId) // Garante que seja string
    },
    callback_url: callbackUrl
  };

  // LOGS DE DEPURAÇÃO (Antes do envio)
  console.log('--- INICIANDO PAGAMENTO PIX ---');
  console.log('Endpoint:', `${apiClient.defaults.baseURL}/pix/payment`);
  console.log('Callback URL configurada:', callbackUrl);
  console.log('Payload enviado:', JSON.stringify(payload, null, 2));

  try {
    const response = await apiClient.post('/pix/payment', payload);
    const { data: paymentData } = response;
    
    console.log('Sucesso VizzionPay:', paymentData.id || paymentData.transaction_id);

    return {
      success: true,
      pixCode: paymentData.pix_code || paymentData.qrcode || paymentData.emv,
      qrImage: paymentData.qr_image || paymentData.qrcode_image,
      transactionId: paymentData.transaction_id || paymentData.id || paymentData.txid
    };

  } catch (error) {
    // LOGS DETALHADOS DE ERRO PARA NETLIFY
    console.error('--- ERRO VIZZION PAY (CRIAR PAGAMENTO) ---');
    if (error.response) {
      console.error('Status HTTP:', error.response.status);
      console.error('Dados do Erro (Response Body):', JSON.stringify(error.response.data, null, 2));
      
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Erro na API VizzionPay ao criar pagamento',
        details: error.response.data
      };
    } else if (error.request) {
      console.error('Sem resposta do servidor:', error.message);
      throw new Error('O servidor da VizzionPay não respondeu a tempo ou está indisponível.');
    } else {
      console.error('Erro de configuração:', error.message);
      throw new Error(`Erro interno na requisição: ${error.message}`);
    }
  }
}

/**
 * Verificar status do pagamento
 * @param {string} transactionId - ID da transação
 * @returns {Promise<Object>} - { status, amount, paidAt }
 */
async function verificarStatusPagamento(transactionId) {
  validarCredenciais();
  try {
    const response = await apiClient.get(`/pix/payment/${transactionId}`);
    const { data } = response;

    return {
      status: data.status, // PENDING, COMPLETED, FAILED, EXPIRED
      amount: data.amount,
      paidAt: data.paid_at || data.completed_at
    };
  } catch (error) {
    console.error(`Erro ao verificar status (${transactionId}):`, error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao verificar status do pagamento');
  }
}

/**
 * Gerar QR Code (caso necessário separadamente)
 * @param {string} pixCode - Código PIX copia e cola
 * @returns {Promise<string|null>} - URL da imagem QR Code
 */
async function gerarQRCode(pixCode) {
  validarCredenciais();
  try {
    const response = await apiClient.post('/pix/qrcode', { pix_code: pixCode });
    return response.data.qr_image;
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Consultar transação
 * @param {string} transactionId - ID da transação
 * @returns {Promise<Object>} - Dados completos da transação
 */
async function consultarTransacao(transactionId) {
  validarCredenciais();
  try {
    const response = await apiClient.get(`/transactions/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao consultar transação (${transactionId}):`, error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao consultar transação');
  }
}

/**
 * Criar saque PIX (transferência)
 * @param {Object} data - { amount, pixKey, pixType, userId }
 * @returns {Promise<Object>} - { transactionId, status }
 */
async function criarSaquePIX(data) {
  validarCredenciais();
  const { amount, pixKey, pixType, userId } = data;

  const payload = {
    amount: parseFloat(amount),
    pix_key: pixKey,
    pix_key_type: pixType, // email, cpf, phone, random
    external_id: String(userId),
    description: 'Saque Monety'
  };

  try {
    const response = await apiClient.post('/pix/transfer', payload);
    const { data: transferData } = response;

    return {
      success: true,
      transactionId: transferData.transaction_id || transferData.id,
      status: transferData.status
    };
  } catch (error) {
    console.error('--- ERRO VIZZION PAY (CRIAR SAQUE) ---');
    if (error.response) {
      console.error('Status HTTP:', error.response.status);
      console.error('Dados do Erro:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erro na requisição:', error.message);
    }
    throw error.response?.data || new Error('Falha ao processar saque na VizzionPay');
  }
}

/**
 * Enviar pagamento (após aprovação admin)
 * @param {string} withdrawId - ID do saque no sistema
 * @param {Object} data - { amount, pixKey, pixType }
 * @returns {Promise<Object>} - { transactionId, status }
 */
async function enviarPagamento(withdrawId, data) {
  try {
    const result = await criarSaquePIX({
      ...data,
      userId: withdrawId
    });

    return result;
  } catch (error) {
    console.error(`Erro ao enviar pagamento para withdrawId ${withdrawId}:`, error);
    throw error;
  }
}

/**
 * Consultar status do saque
 * @param {string} transactionId - ID da transação VizzionPay
 * @returns {Promise<Object>} - { status, completedAt }
 */
async function consultarStatusSaque(transactionId) {
  validarCredenciais();
  try {
    const response = await apiClient.get(`/pix/transfer/${transactionId}`);
    const { data } = response;

    return {
      status: data.status, // PROCESSING, COMPLETED, FAILED
      completedAt: data.completed_at,
      failureReason: data.failure_reason
    };
  } catch (error) {
    console.error(`Erro ao consultar saque (${transactionId}):`, error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao consultar status do saque');
  }
}

module.exports = {
  criarPagamentoPIX,
  verificarStatusPagamento,
  gerarQRCode,
  consultarTransacao,
  criarSaquePIX,
  enviarPagamento,
  consultarStatusSaque
};

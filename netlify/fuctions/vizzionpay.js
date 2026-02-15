// ========================================
// BIBLIOTECA VIZZIONPAY - API CLIENT
// ========================================
// Funções genéricas para integração com VizzionPay

const axios = require('axios');

// Validação inicial das variáveis de ambiente
const VIZZION_TOKEN = process.env.VIZZION_TOKEN;
const VIZZION_BASE_URL = process.env.VIZZION_BASE_URL || 'https://api.vizzionpay.com/v1';

// Lógica para definir a Base URL do site (Produção vs Localhost Netlify)
const SITE_URL = process.env.URL || 'http://localhost:8888';

/**
 * Helper para validar se o token existe antes de chamar a API
 */
function validarCredenciais() {
  if (!VIZZION_TOKEN) {
    throw new Error('VIZZION_TOKEN não está definido nas variáveis de ambiente.');
  }
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
  console.log('Endpoint:', `${VIZZION_BASE_URL}/pix/payment`);
  console.log('Callback URL configurada:', callbackUrl);
  console.log('Payload enviado:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      `${VIZZION_BASE_URL}/pix/payment`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${VIZZION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { data: paymentData } = response;
    
    console.log('Sucesso VizzionPay:', paymentData.id || paymentData.transaction_id);

    return {
      success: true,
      pixCode: paymentData.pix_code || paymentData.qrcode || paymentData.emv,
      qrImage: paymentData.qr_image || paymentData.qrcode_image,
      transactionId: paymentData.transaction_id || paymentData.id || paymentData.txid
    };

  } catch (error) {
    // LOGS DETALHADOS DE ERRO
    console.error('--- ERRO VIZZION PAY ---');
    if (error.response) {
      // O servidor respondeu com um status fora de 2xx
      console.error('Status HTTP:', error.response.status);
      console.error('Dados do Erro (Response Body):', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      
      // Lança o erro detalhado da API para quem chamou a função
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Erro na API VizzionPay',
        details: error.response.data
      };
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      throw new Error('O servidor da VizzionPay não respondeu.');
    } else {
      // Erro na configuração da requisição
      console.error('Erro de configuração:', error.message);
      throw new Error(`Erro interno: ${error.message}`);
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
    const response = await axios.get(
      `${VIZZION_BASE_URL}/pix/payment/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${VIZZION_TOKEN}`
        }
      }
    );

    const { data } = response;

    return {
      status: data.status, // PENDING, COMPLETED, FAILED, EXPIRED
      amount: data.amount,
      paidAt: data.paid_at || data.completed_at
    };
  } catch (error) {
    console.error('Erro ao verificar status:', error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao verificar status do pagamento');
  }
}

/**
 * Gerar QR Code (caso necessário separadamente)
 * @param {string} pixCode - Código PIX copia e cola
 * @returns {Promise<string>} - URL da imagem QR Code
 */
async function gerarQRCode(pixCode) {
  validarCredenciais();
  try {
    const response = await axios.post(
      `${VIZZION_BASE_URL}/pix/qrcode`,
      { pix_code: pixCode },
      {
        headers: {
          'Authorization': `Bearer ${VIZZION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

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
    const response = await axios.get(
      `${VIZZION_BASE_URL}/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${VIZZION_TOKEN}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Erro ao consultar transação:', error.response?.data || error.message);
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

  try {
    const response = await axios.post(
      `${VIZZION_BASE_URL}/pix/transfer`,
      {
        amount: parseFloat(amount),
        pix_key: pixKey,
        pix_key_type: pixType, // email, cpf, phone, random
        external_id: String(userId),
        description: 'Saque Monety'
      },
      {
        headers: {
          'Authorization': `Bearer ${VIZZION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { data: transferData } = response;

    return {
      success: true,
      transactionId: transferData.transaction_id || transferData.id,
      status: transferData.status
    };
  } catch (error) {
    console.error('Erro ao criar saque VizzionPay:', error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao processar saque');
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
    console.error('Erro ao enviar pagamento:', error);
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
    const response = await axios.get(
      `${VIZZION_BASE_URL}/pix/transfer/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${VIZZION_TOKEN}`
        }
      }
    );

    const { data } = response;

    return {
      status: data.status, // PROCESSING, COMPLETED, FAILED
      completedAt: data.completed_at,
      failureReason: data.failure_reason
    };
  } catch (error) {
    console.error('Erro ao consultar saque:', error.response?.data || error.message);
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

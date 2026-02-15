// ========================================
// BIBLIOTECA VIZZIONPAY - API CLIENT
// ========================================
const axios = require('axios');

// Configuração das variáveis de ambiente
// IMPORTANTE: O nome da variável do token foi ajustado conforme seu contexto
const VIZZION_TOKEN = process.env.VIZZIONPAY_TOKEN; 
const VIZZION_BASE_URL = process.env.VIZZION_BASE_URL || 'https://api.vizzionpay.com/v1';
const SITE_URL = process.env.URL || 'http://localhost:8888'; // Fallback para local dev

// Validação inicial para evitar erros silenciosos
if (!VIZZION_TOKEN) {
  console.warn('⚠️ AVISO: VIZZIONPAY_TOKEN não está definido nas variáveis de ambiente.');
}

/**
 * Criar pagamento PIX na VizzionPay
 * @param {Object} data - { amount, userId, userName, description }
 * @returns {Promise<Object>} - { pixCode, qrImage, transactionId }
 */
async function criarPagamentoPIX(data) {
  const { amount, userId, userName, description } = data;

  // Montagem do payload
  const payload = {
    amount: parseFloat(amount).toFixed(2), // Garante formato 00.00
    description: description || `Depósito Monety - ${userName}`,
    customer: {
      name: userName,
      external_id: userId
    },
    // Define o webhook para receber a confirmação
    callback_url: `${SITE_URL}/.netlify/functions/webhook-payment`
  };

  const endpoint = `${VIZZION_BASE_URL}/pix/payment`;

  console.log(`🚀 [VizzionPay] Iniciando criação de PIX...`);
  console.log(`📍 Endpoint: ${endpoint}`);
  console.log(`📦 Payload enviado:`, JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      endpoint,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${VIZZION_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // Timeout de 10s para evitar travamento da function
      }
    );

    console.log(`✅ [VizzionPay] Sucesso! Status: ${response.status}`);
    // Log da resposta completa para debug (remova em produção se for muito verboso)
    // console.log(`📄 Resposta:`, JSON.stringify(response.data, null, 2));

    const { data: paymentData } = response;

    // Normalização dos dados de retorno (trata diferentes formatos possíveis da API)
    return {
      success: true,
      pixCode: paymentData.pix_code || paymentData.qrcode || paymentData.emv,
      qrImage: paymentData.qr_image || paymentData.qrcode_image || paymentData.imagem_qrcode,
      transactionId: paymentData.transaction_id || paymentData.id || paymentData.txid
    };

  } catch (error) {
    // === TRATAMENTO DE ERRO DETALHADO ===
    
    let errorMessage = 'Falha ao conectar com VizzionPay';
    let errorDetails = {};

    if (error.response) {
      // O servidor respondeu com um status fora de 2xx
      console.error(`❌ [VizzionPay] Erro de API: ${error.response.status}`);
      console.error(`DETAILS:`, JSON.stringify(error.response.data, null, 2));
      
      errorMessage = error.response.data?.message || error.response.data?.error || 'Erro na API VizzionPay';
      errorDetails = error.response.data;
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error(`❌ [VizzionPay] Sem resposta do servidor.`);
      errorMessage = 'Sem resposta do gateway de pagamento (Timeout ou erro de rede)';
    } else {
      // Erro na configuração da requisição
      console.error(`❌ [VizzionPay] Erro de configuração:`, error.message);
      errorMessage = error.message;
    }

    // Lança um erro que o create-payment.js conseguirá ler e retornar ao front
    const complexError = new Error(errorMessage);
    complexError.details = errorDetails; 
    throw complexError;
  }
}

/**
 * Verificar status do pagamento
 */
async function verificarStatusPagamento(transactionId) {
  try {
    const response = await axios.get(
      `${VIZZION_BASE_URL}/pix/payment/${transactionId}`,
      {
        headers: { 'Authorization': `Bearer ${VIZZION_TOKEN}` }
      }
    );
    return {
      status: response.data.status,
      amount: response.data.amount,
      paidAt: response.data.paid_at || response.data.completed_at
    };
  } catch (error) {
    console.error(`Erro ao verificar status [${transactionId}]:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao verificar status');
  }
}

/**
 * Gerar QR Code
 */
async function gerarQRCode(pixCode) {
  try {
    const response = await axios.post(
      `${VIZZION_BASE_URL}/pix/qrcode`,
      { pix_code: pixCode },
      {
        headers: { 'Authorization': `Bearer ${VIZZION_TOKEN}` }
      }
    );
    return response.data.qr_image;
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Consultar transação genérica
 */
async function consultarTransacao(transactionId) {
  try {
    const response = await axios.get(
      `${VIZZION_BASE_URL}/transactions/${transactionId}`,
      {
        headers: { 'Authorization': `Bearer ${VIZZION_TOKEN}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao consultar transação:', error.response?.data || error.message);
    throw new Error('Falha ao consultar transação');
  }
}

/**
 * Criar Saque (Transferência)
 */
async function criarSaquePIX(data) {
  const { amount, pixKey, pixType, userId } = data;
  try {
    const response = await axios.post(
      `${VIZZION_BASE_URL}/pix/transfer`,
      {
        amount: parseFloat(amount),
        pix_key: pixKey,
        pix_key_type: pixType,
        external_id: userId,
        description: 'Saque Monety'
      },
      {
        headers: { 'Authorization': `Bearer ${VIZZION_TOKEN}` }
      }
    );
    return {
      success: true,
      transactionId: response.data.transaction_id || response.data.id,
      status: response.data.status
    };
  } catch (error) {
    console.error('Erro ao criar saque:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao processar saque');
  }
}

async function enviarPagamento(withdrawId, data) {
  return criarSaquePIX({ ...data, userId: withdrawId });
}

async function consultarStatusSaque(transactionId) {
  try {
    const response = await axios.get(
      `${VIZZION_BASE_URL}/pix/transfer/${transactionId}`,
      {
        headers: { 'Authorization': `Bearer ${VIZZION_TOKEN}` }
      }
    );
    return {
      status: response.data.status,
      completedAt: response.data.completed_at,
      failureReason: response.data.failure_reason
    };
  } catch (error) {
    console.error('Erro consultar status saque:', error.response?.data || error.message);
    throw new Error('Falha ao consultar status do saque');
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

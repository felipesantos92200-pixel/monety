// ========================================
// BIBLIOTECA VIZZIONPAY - API CLIENT
// ========================================
require('dotenv').config();
const axios = require('axios');

const VIZZION_BASE_URL = process.env.VIZZION_BASE_URL || 'https://app.vizzionpay.com/api/v1';
const SITE_URL = process.env.URL || 'http://localhost:8888';

const apiClient = axios.create({
  baseURL: VIZZION_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Helper para validar o token
 */
function validarCredenciais() {
  const token = process.env.VIZZION_SECRET_KEY;

  if (!token) {
    throw new Error('A variável VIZZION_TOKEN não está definida no ambiente.');
  }

  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

/**
 * Criar pagamento PIX na VizzionPay
 */
async function criarPagamentoPIX(data) {
  validarCredenciais();
  // document e email são obrigatórios na nova API (client)
  const { amount, userId, userName, userEmail, userDocument } = data;

  const callbackUrl = `${SITE_URL}/.netlify/functions/webhook-payment`;

  const payload = {
    identifier: `${userId}-${Date.now()}`,
    amount: parseFloat(amount),
    client: {
      name: userName,
      email: userEmail || 'email@naoinformado.com',
      document: userDocument || '02499967315'
    },
    callbackUrl: callbackUrl
  };

  try {
    const response = await apiClient.post('/gateway/pix/receive', payload);
    const { data: paymentData } = response;
    
    return {
      success: true,
      pixCode: paymentData.pixCode || paymentData.emv,
      qrImage: paymentData.qrImage || paymentData.qrcodeImage,
      transactionId: paymentData.id || paymentData.transactionId
    };
  } catch (error) {
    console.error('--- ERRO VIZZION PAY (CRIAR PAGAMENTO) ---');
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Erro na API VizzionPay ao criar pagamento',
        details: error.response.data
      };
    }
    throw new Error(`Erro interno na requisição: ${error.message}`);
  }
}

/**
 * Verificar status de uma transação (Depósito)
 */
async function verificarStatusPagamento(transactionId) {
  validarCredenciais();
  try {
    const response = await apiClient.get(`/gateway/transactions?id=${transactionId}`);
    const { data } = response;

    return {
      status: data.status,
      amount: data.amount,
      payedAt: data.payedAt || data.completedAt,
      availableAt: data.availableAt
    };
  } catch (error) {
    throw error.response?.data || new Error('Falha ao verificar status da transação');
  }
}

/**
 * Criar transferência (Saque)
 */
async function criarSaquePIX(data) {
  validarCredenciais();
  const { amount, pixKey, pixType, withdrawId, ownerName, ownerDocument } = data;
  
  const callbackUrl = `${SITE_URL}/.netlify/functions/webhook-transfer`;

  const payload = {
    identifier: String(withdrawId),
    amount: parseFloat(amount),
    discountFeeOfReceiver: false, // Assumindo que a taxa já foi descontada no sistema interno
    pix: {
      key: pixKey,
      type: pixType
    },
    owner: {
      name: ownerName || 'Nome Não Informado',
      document: ownerDocument || '02499967315'
    },
    callbackUrl: callbackUrl
  };

  try {
    const response = await apiClient.post('/gateway/transfers', payload);
    const { data: transferData } = response;

    return {
      success: true,
      transactionId: transferData.id || transferData.transactionId,
      status: transferData.status
    };
  } catch (error) {
    console.error('--- ERRO VIZZION PAY (CRIAR SAQUE) ---');
    throw error.response?.data || new Error('Falha ao processar saque na VizzionPay');
  }
}

/**
 * Consultar status do saque (Transferência)
 */
async function consultarStatusSaque(transactionId) {
  validarCredenciais();
  try {
    const response = await apiClient.get(`/gateway/transfers?id=${transactionId}`);
    const { data } = response;

    return {
      status: data.status,
      payedAt: data.payedAt || data.completedAt
    };
  } catch (error) {
    console.error("========= ERRO COMPLETO VIZZION =========");
    console.error("STATUS:", error.response?.status);
    console.error("DATA:", JSON.stringify(error.response?.data, null, 2));
    console.error("==========================================");

    throw {
      status: error.response?.status || 500,
      message: error.response?.data?.message || "Erro na API VizzionPay",
      details: error.response?.data || null
    };
  }
} // <-- CHAVE ADICIONADA AQUI PARA FECHAR A FUNÇÃO

module.exports = {
  criarPagamentoPIX,
  verificarStatusPagamento,
  criarSaquePIX,
  consultarStatusSaque
};

// ========================================
// BIBLIOTECA VIZZIONPAY - API CLIENT
// ========================================
// Funções genéricas para integração com VizzionPay

const axios = require('axios');

const VIZZION_TOKEN = process.env.VIZZION_TOKEN || 'SEU_TOKEN_VIZZION_AQUI';
const VIZZION_BASE_URL = process.env.VIZZION_BASE_URL || 'https://api.vizzionpay.com/v1';

/**
 * Criar pagamento PIX na VizzionPay
 * @param {Object} data - { amount, userId, userName, description }
 * @returns {Promise<Object>} - { pixCode, qrImage, transactionId }
 */
async function criarPagamentoPIX(data) {
  const { amount, userId, userName, description } = data;

  try {
    const response = await axios.post(
      `${VIZZION_BASE_URL}/pix/payment`,
      {
        amount: parseFloat(amount),
        description: description || `Depósito Monety - ${userName}`,
        customer: {
          name: userName,
          external_id: userId
        },
        callback_url: `${process.env.URL}/.netlify/functions/webhook-payment`
      },
      {
        headers: {
          'Authorization': `Bearer ${VIZZION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Estrutura esperada da VizzionPay (ajustar conforme documentação)
    const { data: paymentData } = response;

    return {
      success: true,
      pixCode: paymentData.pix_code || paymentData.qrcode || paymentData.emv,
      qrImage: paymentData.qr_image || paymentData.qrcode_image,
      transactionId: paymentData.transaction_id || paymentData.id || paymentData.txid
    };
  } catch (error) {
    console.error('Erro ao criar pagamento VizzionPay:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao criar pagamento PIX');
  }
}

/**
 * Verificar status do pagamento
 * @param {string} transactionId - ID da transação
 * @returns {Promise<Object>} - { status, amount, paidAt }
 */
async function verificarStatusPagamento(transactionId) {
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
    throw new Error('Falha ao verificar status do pagamento');
  }
}

/**
 * Gerar QR Code (caso necessário separadamente)
 * @param {string} pixCode - Código PIX copia e cola
 * @returns {Promise<string>} - URL da imagem QR Code
 */
async function gerarQRCode(pixCode) {
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
    throw new Error('Falha ao consultar transação');
  }
}

/**
 * Criar saque PIX (transferência)
 * @param {Object} data - { amount, pixKey, pixType, userId }
 * @returns {Promise<Object>} - { transactionId, status }
 */
async function criarSaquePIX(data) {
  const { amount, pixKey, pixType, userId } = data;

  try {
    const response = await axios.post(
      `${VIZZION_BASE_URL}/pix/transfer`,
      {
        amount: parseFloat(amount),
        pix_key: pixKey,
        pix_key_type: pixType, // email, cpf, phone, random
        external_id: userId,
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
    throw new Error(error.response?.data?.message || 'Falha ao processar saque');
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

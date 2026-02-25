const axios = require('axios');

/**
 * Valida o formato de um e-mail.
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Cria um pagamento PIX na VizzionPay
 * @param {Object} params - Parâmetros do pagamento
 * @returns {Promise<Object>} Resultado padronizado: { success, message, details }
 */
const criarPagamentoPIX = async ({ userId, amount, userName, userEmail, userDocument, callbackUrl }) => {
  // ========================================
  // 1. VALIDAÇÃO E SANITIZAÇÃO DOS DADOS
  // ========================================

  // Validação de Valor (amount)
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return {
      success: false,
      message: 'Valor (amount) inválido. Deve ser um número positivo.'
    };
  }
  // Garante exatamente 2 casas decimais (Ex: 15.50) e converte de volta para Number 
  // (algumas APIs rejeitam string ou floats com muitas casas decimais)
  const formattedAmount = Number(numericAmount.toFixed(2));

  // Validação de Nome
  if (!userName || userName.trim().length < 3) {
    return {
      success: false,
      message: 'Nome do cliente inválido.'
    };
  }

  // Validação de E-mail
  if (!userEmail || !isValidEmail(userEmail.trim())) {
    return {
      success: false,
      message: 'E-mail do cliente inválido.'
    };
  }

  // Sanitização e Validação do Documento (Remove pontuação, mantém só números)
  const cleanDocument = userDocument ? userDocument.toString().replace(/\D/g, '') : '';
  if (!cleanDocument || (cleanDocument.length !== 11 && cleanDocument.length !== 14)) {
    return {
      success: false,
      message: 'Documento (CPF/CNPJ) inválido. Certifique-se de enviar um documento real de 11 ou 14 dígitos.'
    };
  }

  // ========================================
  // 2. MONTAGEM DO PAYLOAD
  // ========================================
  const payload = {
    identifier: `${userId}-${Date.now()}`,
    amount: formattedAmount,
    client: {
      name: userName.trim(),
      email: userEmail.trim(),
      document: cleanDocument // Enviando apenas números
    },
    callbackUrl: callbackUrl
  };

  // ========================================
  // 3. CHAMADA À API E TRATAMENTO DE ERRO
  // ========================================
  try {
    const response = await axios.post(
      `${process.env.VIZZION_BASE_URL}/gateway/pix/receive`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.VIZZION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Retorno de Sucesso
    return {
      success: true,
      message: 'Pagamento PIX gerado com sucesso.',
      details: response.data // Geralmente contém o QR Code, copia e cola, txid, etc.
    };

  } catch (error) {
    // Retorno de Erro - Estruturado para Debug e Produção
    
    // Cenário A: A API respondeu com erro (ex: 400 Bad Request, 401 Unauthorized)
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      console.error(`[VizzionPay] Erro ${statusCode} ao criar PIX:`, JSON.stringify(errorData, null, 2));
      
      return {
        success: false,
        message: `A API recusou a requisição (Status: ${statusCode}).`,
        details: errorData // Expõe exatamente qual campo a VizzionPay está reclamando
      };
    } 
    
    // Cenário B: A requisição foi feita, mas não houve resposta da API
    if (error.request) {
      console.error('[VizzionPay] Sem resposta do servidor:', error.request);
      return {
        success: false,
        message: 'A API de pagamento não respondeu. Tente novamente mais tarde.'
      };
    } 
    
    // Cenário C: Erro na configuração do Node/Axios
    console.error('[VizzionPay] Erro interno:', error.message);
    return {
      success: false,
      message: 'Erro interno na configuração da requisição de pagamento.',
      details: { error: error.message }
    };
  }
};

module.exports = {
  criarPagamentoPIX,
  // ... exportar verificarStatusPagamento também, se estiver no mesmo arquivo
};

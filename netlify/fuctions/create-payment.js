// ========================================
// NETLIFY FUNCTION: Criar Pagamento PIX
// ========================================

// 1. Carregar variáveis de ambiente (CRUCIAL para local development)
require('dotenv').config();

const { criarPagamentoPIX } = require('./vizzionpay');
const admin = require('firebase-admin');

// 2. Inicialização Segura do Firebase Admin
// Verifica se já foi inicializado para evitar erro de "Duplicate App" no hot-reload
if (!admin.apps.length) {
  
  // Verificação defensiva das variáveis críticas
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (privateKey && clientEmail && projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          // Corrige a formatação da chave privada (substitui \\n por quebras de linha reais)
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
      console.log("Firebase Admin inicializado com sucesso.");
    } catch (initError) {
      console.error("Erro crítico na inicialização do Firebase:", initError);
    }
  } else {
    console.warn("Variáveis de ambiente do Firebase não encontradas. O App pode falhar.");
  }
}

// Referência ao Firestore (pode ser undefined se a inicialização falhou)
const db = admin.apps.length ? admin.firestore() : null;

exports.handler = async (event, context) => {
  // Configuração de CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Responder a preflight requests (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Verificar método HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Método não permitido. Use POST.' })
    };
  }

  try {
    // 3. Verificar se o Firebase foi inicializado corretamente
    if (!db) {
      throw new Error("Conexão com Banco de Dados não estabelecida (Verifique as variáveis .env)");
    }

    // Parse do corpo da requisição
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'JSON inválido no corpo da requisição' })
      };
    }

    const { amount, userId, userName } = body;

    // Validações de entrada
    if (!amount || !userId || !userName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Campos obrigatórios: amount, userId, userName' })
      };
    }

    // Validação de valor mínimo (regra de negócio)
    if (parseFloat(amount) < 30) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Depósito mínimo é R$ 30,00' })
      };
    }

    // 4. Criar pagamento na VizzionPay
    // Certifique-se que vizzionpay.js trata erros corretamente
    const payment = await criarPagamentoPIX({
      amount,
      userId,
      userName,
      description: `Depósito Monety - ${userName}`
    });

    if (!payment || !payment.pixCode) {
      throw new Error("Resposta inválida do gateway de pagamento");
    }

    // 5. Salvar depósito como PENDING no Firestore
    const depositRef = db.collection('deposits').doc();
    
    // Objeto a ser salvo
    const depositData = {
      userId,
      userName,
      amount: parseFloat(amount),
      pixCode: payment.pixCode,
      qrImage: payment.qrImage || '', // Garante string vazia se não vier
      transactionId: payment.transactionId,
      status: 'pending',
      gateway: 'vizzionpay',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await depositRef.set(depositData);

    // Resposta de Sucesso
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pixCode: payment.pixCode,
        qrImage: payment.qrImage,
        transactionId: payment.transactionId,
        depositId: depositRef.id,
        message: 'PIX gerado com sucesso'
      })
    };

  } catch (error) {
    console.error('❌ Erro na function create-payment:', error);
    
    // Retorno de erro seguro (sem expor stack trace sensível para o cliente se não quiser)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Falha ao processar pagamento',
        details: error.message || 'Erro interno no servidor'
      })
    };
  }
};

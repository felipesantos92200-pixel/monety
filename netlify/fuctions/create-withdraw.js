// ========================================
// NETLIFY FUNCTION: Criar Saque
// ========================================
// POST /.netlify/functions/create-withdraw
// Body: { userId, amount, pixKey, pixType }

const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CERT_URL
    })
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    const { userId, amount, pixKey, pixType } = JSON.parse(event.body);

    // Validações
    if (!userId || !amount || !pixKey || !pixType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId, amount, pixKey e pixType são obrigatórios' })
      };
    }

    if (amount < 35) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Saque mínimo é R$ 35,00' })
      };
    }

    // Validar horário (09h-17h BRT)
    const now = new Date();
    const brasiliaOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const brasiliaTime = new Date(now.getTime() + (localOffset + brasiliaOffset) * 60000);
    const hour = brasiliaTime.getHours();

    if (hour < 9 || hour >= 17) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Saque indisponível',
          message: 'Saques permitidos apenas das 09:00 às 17:00 (horário de Brasília)'
        })
      };
    }

    // Verificar saldo
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Usuário não encontrado' })
      };
    }

    const userData = userDoc.data();
    const balance = userData.balance || 0;
    const totalWithFee = amount * 1.1; // Taxa de 10%

    if (balance < totalWithFee) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Saldo insuficiente',
          required: totalWithFee.toFixed(2),
          current: balance.toFixed(2)
        })
      };
    }

    // Descontar saldo
    await userRef.update({
      balance: admin.firestore.FieldValue.increment(-totalWithFee),
      totalWithdrawn: admin.firestore.FieldValue.increment(amount)
    });

    // Criar saque como PENDENTE (aguarda aprovação do admin)
    const withdrawalRef = userRef.collection('withdrawals').doc();
    await withdrawalRef.set({
      amount: parseFloat(amount),
      fee: amount * 0.1,
      netAmount: amount * 0.9,
      pixKey: pixKey,
      pixType: pixType,
      status: 'processing', // Admin vai aprovar/rejeitar
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Registrar transação
    await userRef.collection('transactions').add({
      type: 'withdrawal',
      amount: parseFloat(amount),
      status: 'processing',
      description: `Saque via PIX (${pixType}: ${pixKey})`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        withdrawalId: withdrawalRef.id,
        message: 'Saque solicitado com sucesso',
        note: 'Aguarde aprovação do admin'
      })
    };

  } catch (error) {
    console.error('❌ Erro ao criar saque:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Falha ao processar saque',
        details: error.message
      })
    };
  }
};

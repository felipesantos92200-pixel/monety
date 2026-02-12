// ========================================
// NETLIFY FUNCTION: Webhook de Confirmação VizzionPay
// ========================================
// POST /.netlify/functions/webhook-payment

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
    const webhookData = JSON.parse(event.body);
    console.log('📨 Webhook VizzionPay recebido:', JSON.stringify(webhookData, null, 2));

    // Estrutura esperada da VizzionPay (ajustar conforme documentação)
    const status = webhookData.status || webhookData.payment_status;
    const transactionId = webhookData.transaction_id || webhookData.id || webhookData.txid;
    const amount = webhookData.amount || webhookData.value;
    const externalReference = webhookData.external_reference || webhookData.external_id;

    // Ignorar se não for pagamento concluído
    if (status !== 'COMPLETED' && status !== 'paid' && status !== 'approved') {
      console.log(`⏭️ Status ignorado: ${status}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Status não processado', status })
      };
    }

    if (!transactionId) {
      console.error('❌ Transaction ID não encontrado no webhook');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Transaction ID ausente' })
      };
    }

    // Buscar depósito no Firestore
    const depositsSnapshot = await db.collection('deposits')
      .where('transactionId', '==', transactionId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (depositsSnapshot.empty) {
      console.log('⚠️ Depósito não encontrado ou já processado');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Depósito já processado ou não encontrado' })
      };
    }

    const depositDoc = depositsSnapshot.docs[0];
    const depositData = depositDoc.data();
    const userId = depositData.userId || externalReference;
    const depositAmount = depositData.amount || amount;

    if (!userId) {
      throw new Error('User ID não encontrado no depósito');
    }

    // Processar pagamento com TRANSACTION (segurança)
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error(`Usuário ${userId} não encontrado`);
      }

      const userData = userDoc.data();

      // Verificar se é primeiro depósito
      const userDepositsSnapshot = await db.collection('deposits')
        .where('userId', '==', userId)
        .where('status', '==', 'completed')
        .get();

      const isFirstDeposit = userDepositsSnapshot.empty;

      // Atualizar saldo + dar giros
      const updates = {
        balance: admin.firestore.FieldValue.increment(depositAmount),
        totalEarned: admin.firestore.FieldValue.increment(depositAmount),
        spins: admin.firestore.FieldValue.increment(1) // 1 giro por depósito
      };

      // Se primeiro depósito, marcar convite como ativo
      if (isFirstDeposit) {
        updates.inviteStatus = 'active';
        console.log(`✅ Primeiro depósito de ${userId} - Convite ativado`);
      }

      transaction.update(userRef, updates);

      // Sistema de convites: dar giro para convidador
      if (userData.invitedBy) {
        const inviterRef = db.collection('users').doc(userData.invitedBy);
        const inviterDoc = await transaction.get(inviterRef);

        if (inviterDoc.exists) {
          transaction.update(inviterRef, {
            spins: admin.firestore.FieldValue.increment(1)
          });

          // Registrar transação de bônus
          const bonusRef = db.collection('users').doc(userData.invitedBy)
            .collection('transactions').doc();

          transaction.set(bonusRef, {
            type: 'bonus',
            amount: 0,
            description: `Bônus: ${userData.email || 'Convidado'} fez depósito`,
            bonus: '1 giro de roleta',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log(`🎉 Convidador ${userData.invitedBy} ganhou 1 giro`);
        }
      }

      // Atualizar status do depósito
      transaction.update(depositDoc.ref, {
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Criar registro de transação
      const transactionRef = db.collection('users').doc(userId)
        .collection('transactions').doc();

      transaction.set(transactionRef, {
        type: 'deposit',
        amount: depositAmount,
        status: 'completed',
        description: 'Depósito via PIX',
        gateway: 'vizzionpay',
        transactionId: transactionId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log(`✅ Pagamento processado com sucesso: R$ ${depositAmount} → ${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Pagamento confirmado',
        userId: userId,
        amount: depositAmount
      })
    };

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro ao processar pagamento',
        details: error.message
      })
    };
  }
};

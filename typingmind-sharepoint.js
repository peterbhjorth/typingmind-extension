(function() {
  const CLIENT_ID = 'b7c27904-0351-4e19-a901-932fd4e68bc3';
  const TENANT_ID = '0a694ad7-a147-4bb4-b730-ee5caf3b3b8c';
  const CLIENT_SECRET = 'de8c0c68-c3ac-4251-81b3-5d762b3bdbbe';
  const SHAREPOINT_SITE = 'sovisas.sharepoint.com:/sites/Distress:';
  const FOLDER_PATH = '/Shared Documents/AI Workspace/Chats/Incoming';

  async function getAccessToken() {
    const response = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&scope=https://graph.microsoft.com/.default&grant_type=client_credentials`
      }
    );
    const data = await response.json();
    return data.access_token;
  }

  async function saveToSharePoint(topic, conversation) {
    try {
      const token = await getAccessToken();
      const fileName = `${topic}_${new Date().toISOString().split('T')[0]}.txt`;
      await fetch(
        `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE}/drive/root:${FOLDER_PATH}/${fileName}:/content`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain'
          },
          body: conversation
        }
      );
      console.log('Chat saved to SharePoint!');
    } catch(err) {
      console.log('Error saving chat:', err);
    }
  }

  function getChatsFromIndexedDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onsuccess = function(e) {
        const db = e.target.result;
        const tx = db.transaction('keyval', 'readonly');
        const store = tx.objectStore('keyval');
        const req = store.getAllKeys();
        req.onsuccess = function() {
          const chatKeys = req.result.filter(k => k.startsWith('CHAT_'));
          if (chatKeys.length > 0) {
            const latestKey = chatKeys[chatKeys.length - 1];
            const chatReq = store.get(latestKey);
            chatReq.onsuccess = function() {
              resolve({key: latestKey, data: chatReq.result});
            }
          }
        }
      }
    });
  }

  let lastChatKey = null;
  setInterval(async () => {
    const chat = await getChatsFromIndexedDB();
    if (chat && chat.key !== lastChatKey) {
      lastChatKey = chat.key;
      const topic = chat.data?.title || chat.key;
      const messages = chat.data?.messages || [];
      const conversation = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');
      if (conversation) {
        saveToSharePoint(topic, conversation);
      }
    }
  }, 30000);
})();

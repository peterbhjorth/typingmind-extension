(function() {
  const AZURE_FUNCTION_URL = 'https://typingmind-sharepoint-gyaraubvcpfac7fg.westeurope-01.azurewebsites.net/api/SaveChat';

  function saveToSharePoint(topic, conversation) {
    fetch(AZURE_FUNCTION_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({topic, conversation})
    })
    .then(res => res.text())
    .then(result => console.log('SharePoint result:', result))
    .catch(err => console.log('Error saving chat:', err));
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
        .map(m => {
          const role = m.role || 'unknown';
          let content = '';
          if (typeof m.content === 'string') {
            content = m.content;
          } else if (Array.isArray(m.content)) {
            content = m.content
              .map(c => c.text || c.content || JSON.stringify(c))
              .join(' ');
          } else {
            content = JSON.stringify(m.content);
          }
          return role + ': ' + content;
        })
        .join('\n');
      if (conversation) {
        saveToSharePoint(topic, conversation);
      }
    }
  }, 30000);
})();

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

  async function saveCurrentChat() {
    const chat = await getChatsFromIndexedDB();
    if (!chat) return;
    
    const messages = chat.data?.messages || [];
    if (messages.length === 0) return;
    
    const topic = chat.data?.title || chat.key;
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
      console.log('Saving chat to SharePoint...');
      saveToSharePoint(topic, conversation);
    }
  }

  // Save when browser/tab closes
  window.addEventListener('beforeunload', function() {
    saveCurrentChat();
  });

  // Save at 23:59 every day
  function scheduleEndOfDay() {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 0, 0);
    
    // If already past 23:59, schedule for tomorrow
    if (now > endOfDay) {
      endOfDay.setDate(endOfDay.getDate() + 1);
    }
    
    const msUntilEndOfDay = endOfDay - now;
    console.log('Next save scheduled in:', Math.round(msUntilEndOfDay/60000), 'minutes');
    
    setTimeout(async function() {
      await saveCurrentChat();
      scheduleEndOfDay(); // Schedule next day
    }, msUntilEndOfDay);
  }

  scheduleEndOfDay();
  console.log('SharePoint extension loaded successfully!');
})();

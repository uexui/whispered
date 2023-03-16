const messageTextarea = document.getElementById('message');
const messageList = document.getElementById('message-list');

loginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error signing in:', error);
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.hidden = true;
        mainSection.hidden = false;
        usernameDisplay.textContent = user.displayName;

        const userMailboxQuery = query(collection(firestore, 'messages'), where('to', '==', user.uid));
        onSnapshot(userMailboxQuery, (querySnapshot) => {
            messageList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const listItem = document.createElement('li');
                listItem.textContent = doc.data().content;
                messageList.appendChild(listItem);
            });
        });
    } else {
        loginSection.hidden = false;
        mainSection.hidden = true;
        usernameDisplay.textContent = '';
    }
});

const detectBlow = async () => {
    const audioContext = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    source.connect(analyser);

    analyser.fftSize = 1024;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const detect = () => {
        requestAnimationFrame(detect);

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / bufferLength;

        if (avg > 128) {
            sendMessage();
        }
    };

    detect();
};

const sendMessage = async () => {
    if (!auth.currentUser || !messageTextarea.value.trim()) {
        return;
    }

    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    const onlineUsers = usersSnapshot.docs.filter((doc) => doc.id !== auth.currentUser.uid);
    if (onlineUsers.length === 0) {
        alert('No other users are online to receive your message.');
        return;
    }

    const randomRecipient = onlineUsers[Math.floor(Math.random() * onlineUsers.length)].id;

    try {
        await addDoc(collection(firestore, 'messages'), {
            from: auth.currentUser.uid,
            to: randomRecipient,
            content: messageTextarea.value.trim(),
            timestamp: serverTimestamp(),
        });

        messageTextarea.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
    }
};

detectBlow();

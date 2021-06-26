const POST_COMMENT_BTN = document.getElementById('post');
const COMMENT_TEXT = document.getElementById('comment');
const COMMENTS_LIST = document.getElementById('commentsList');
// CSS do post sendo processado
const PROCESSING_CLASS = 'processing';

// para adicionar usuário um dia
var currentUserName = 'Anonymous';

function handleCommentPost() {
    // Only continue if you are not already processing the comment.
    if (!POST_COMMENT_BTN.classList.contains(PROCESSING_CLASS)) {
        // Set styles to show processing in case it takes a long time.
        POST_COMMENT_BTN.classList.add(PROCESSING_CLASS);
        COMMENT_TEXT.classList.add(PROCESSING_CLASS);

        // Grab the comment text from DOM.
        let currentComment = COMMENT_TEXT.innerText;
        // Convert sentence to lower case which ML Model expects
        // Strip all characters that are not alphanumeric or spaces
        // Then split on spaces to create a word array.
        let lowercaseSentenceArray = currentComment.toLowerCase().replace(/[^\w\s]/g, ' ').split(' ');

        // Create a list item DOM element in memory.
        let li = document.createElement('li');

        // Remember loadAndPredict is asynchronous so you use the then 
        // keyword to await a result before continuing.
        loadAndPredict(tokenize(lowercaseSentenceArray), li).then(function () {
            // Reset class styles ready for the next comment.
            POST_COMMENT_BTN.classList.remove(PROCESSING_CLASS);
            COMMENT_TEXT.classList.remove(PROCESSING_CLASS);

            let p = document.createElement('p');
            p.innerText = COMMENT_TEXT.innerText;

            let spanName = document.createElement('span');
            spanName.setAttribute('class', 'username');
            spanName.innerText = currentUserName;

            let spanDate = document.createElement('span');
            spanDate.setAttribute('class', 'timestamp');
            let curDate = new Date();
            spanDate.innerText = curDate.toLocaleString();

            li.appendChild(spanName);
            li.appendChild(spanDate);
            li.appendChild(p);
            COMMENTS_LIST.prepend(li);

            // Reset comment text.
            COMMENT_TEXT.innerText = '';
        });
    }
}

POST_COMMENT_BTN.addEventListener('click', handleCommentPost);

// Modelo de categorização de palavras
const MODEL_JSON_URL = 'model.json';
// Confiança mínima para ativar, 0.75 = 75%
const SPAM_THRESHOLD = 0.75;

var model = undefined;
async function loadAndPredict(inputTensor, domComment) {
    // Load the model.json and binary files you hosted. Note this is 
    // an asynchronous operation so you use the await keyword
    if (model === undefined) {
        model = await tf.loadLayersModel(MODEL_JSON_URL);
    }

    // Once model has loaded you can call model.predict and pass to it
    // an input in the form of a Tensor. You can then store the result.
    var results = await model.predict(inputTensor);

    // Print the result to the console for us to inspect.
    results.print();

    results.data().then((dataArray) => {
        if (dataArray[1] > SPAM_THRESHOLD) {
            domComment.classList.add('spam');
        } else {
            // Emit socket.io comment event for server to handle containing
            // all the comment data you would need to render the comment on
            // a remote client's front end.
            socket.emit('comment', {
                username: currentUserName,
                timestamp: domComment.querySelectorAll('span')[0].innerText,
                comment: domComment.querySelectorAll('p')[0].innerText
            });
        }
    })
}

import * as DICTIONARY from './dictionary.js';
const ENCODING_LENGTH = 20;

// converte as palavras em tokens que podem ser usados no TF
function tokenize(wordArray) {
    // Always start with the START token.
    let returnArray = [DICTIONARY.START];

    // Loop through the words in the sentence you want to encode.
    // If word is found in dictionary, add that number else
    // you add the UNKNOWN token.
    for (var i = 0; i < wordArray.length; i++) {
        let encoding = DICTIONARY.LOOKUP[wordArray[i]];
        returnArray.push(encoding === undefined ? DICTIONARY.UNKNOWN : encoding);
    }

    // Finally if the number of words was < the minimum encoding length
    // minus 1 (due to the start token), fill the rest with PAD tokens.
    while (i < ENCODING_LENGTH - 1) {
        returnArray.push(DICTIONARY.PAD);
        i++;
    }

    // Log the result to see what you made.
    console.log([returnArray]);

    // Convert to a TensorFlow Tensor and return that.
    return tf.tensor([returnArray]);
}






// conecta com servidor
var socket = io.connect();

function handleRemoteComments(data) {
    let li = document.createElement('li');
    let p = document.createElement('p');
    p.innerText = data.comment;

    let spanName = document.createElement('span');
    spanName.setAttribute('class', 'username');
    spanName.innerText = data.username;

    let spanDate = document.createElement('span');
    spanDate.setAttribute('class', 'timestamp');
    spanDate.innerText = data.timestamp;

    li.appendChild(spanName);
    li.appendChild(spanDate);
    li.appendChild(p);

    COMMENTS_LIST.prepend(li);
}

// escuta pelo emit do servidor
socket.on('remoteComment', handleRemoteComments);
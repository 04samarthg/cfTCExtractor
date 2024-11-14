
let fileHandle = null;

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.color = '#FFF';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.2)';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '1000';

    if (type === 'success') {
        notification.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('myExtensionDB', 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('fileHandles')) {
                db.createObjectStore('fileHandles', { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getFileHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('fileHandles', 'readonly');
        const store = tx.objectStore('fileHandles');
        const request = store.get('fileHandle');

        request.onsuccess = () => {
            resolve(request.result?.handle); 
        };

        request.onerror = () => {
            console.error("Error retrieving file handle from IndexedDB:", request.error);
            reject(request.error);
        };
    });
}

async function saveFileHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('fileHandles', 'readwrite');
        const store = tx.objectStore('fileHandles');
        const request = store.put({ id: 'fileHandle', handle });

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Error saving file handle to IndexedDB:", request.error);
            reject(request.error);
        };
    });
}


async function writeToFile(testCase) {
    console.log("writing to file");

    try {
        if(!fileHandle){
            fileHandle = await promptFile();
        }
        const writer = await fileHandle.createWritable();
        
        const content = `${testCase.input}\nExpected Output:\n${testCase.output}`;
        await writer.write(content);
        await writer.close();
        console.log("Test Case Written");
    } catch (error) {
        console.error("Error in Writing TestCase", error);
        throw error;
    }
}

async function extractTestCases(ipEle, opEle) {
    console.log("Extracting test cases");
    
    let inputText = ipEle.querySelector('pre').innerText.trim();
    let outputText = opEle.querySelector('pre').innerText.trim();

    let testCase = {
        input: inputText,
        output: outputText
    };
    
    try{
        await writeToFile(testCase)
    }
    catch(error){
        console.error("Error in Extracting Test Cases", error);
        showNotification('Error extracting test case!', 'error');
        throw error;
    }
}

async function promptFile() {
    try {
        const storedData = await getFileHandle();

        if (storedData) {
            fileHandle = storedData;
            return fileHandle;
        }

        const [newHandle] = await window.showOpenFilePicker();

        try {
            await saveFileHandle(newHandle);
            fileHandle = newHandle;
        } catch (storageError) {
            console.error("Error saving file handle to IndexedDB:", storageError);
            throw storageError;
        }

        return newHandle;

    } catch (error) {
        console.error("Error in promptFile:", error);
        throw error;
    }
}

function addButton(ipEle, opEle) {
    const button = document.createElement('button');
    button.textContent = 'Extract Test Cases';
    button.style.marginLeft = '10px';
    button.style.padding = '4px 6px';
    button.style.backgroundColor = '#007ACC';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.1)';
    button.style.transition = 'all 0.3s ease';

    button.onmouseenter = () => {
        button.style.backgroundColor = '#005F99';
    };
    button.onmouseleave = () => {
        button.style.backgroundColor = '#007ACC';
    };

    button.addEventListener('click', async () => {
        try {
            await extractTestCases(ipEle, opEle);
            showNotification('Test case extracted and saved!', 'success');
        } catch (error) {
            console.error("Error handling button click:", error);
            showNotification('Error extracting test case!', 'error');
        }
    });

    let title = ipEle.querySelector('.title');
    title.appendChild(button);
}


function addButtonsToAllTC() {
    let testEle = document.querySelector('.sample-tests');
    let ipeles = Array.from(testEle.querySelectorAll('.input'));
    let opeles = Array.from(testEle.querySelectorAll('.output'));

    for (let i = 0; i < ipeles.length; i++) {
        addButton(ipeles[i], opeles[i]);
    }
}

addButtonsToAllTC();

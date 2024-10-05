let web3;
let contract;
const contractAddress = '0x0000000000000000000000000000000000000010';
const chainID = 2013;

function showNotification(message) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = '';

    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'info-message';
    notificationDiv.innerText = message;

    messageContainer.appendChild(notificationDiv);
    messageContainer.style.display = 'block';
}

function showWarning(message) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = '';

    const warningDiv = document.createElement('div');
    warningDiv.className = 'warning-message';
    warningDiv.innerText = message;

    messageContainer.appendChild(warningDiv);
    messageContainer.style.display = 'block';
}

function convertNumberToHexString(number) {
    return `0x${number.toString(16).toUpperCase()}`;
}

async function addCustomNetwork() {
    try {
        await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: convertNumberToHexString(chainID),
                chainName: 'Panarchy',
                rpcUrls: ['https://polytopia.org:8545'],
                nativeCurrency: {
                    name: 'GAS',
                    symbol: 'GAS',
                    decimals: 18,
                },
                blockExplorerUrls: ['https://scan.polytopia.org'],
            }],
        });
    } catch (addError) {
        console.error('Failed to add network:', addError);
    }
}

async function promptNetworkSwitch() {
    showNotification(`A request is being sent to your wallet to switch to the correct network (Chain ID: ${chainID}).`);

    try {
        await addCustomNetwork(); // Try adding the custom network
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: convertNumberToHexString(chainID) }],
        });
    } catch (switchError) {
        console.error('Network switch failed:', switchError);
    }
}

async function checkNetwork() {
    const remoteChainID = Number(await web3.eth.getChainId());
    console.log('Current Chain ID:', remoteChainID);
    return remoteChainID === chainID;
}

async function handleNetworkCheck(account) {
    if (await checkNetwork()) {
        return true;
    }
    
    await promptNetworkSwitch();
    // Check the network again after prompting the user
    return await checkNetwork();
}

function setUI(account) {
    document.getElementById('connectWalletButton').style.display = 'none';
    document.getElementById('accountDisplay').innerHTML = `Connected Account: <span class="truncated-address">${account}</span>`;
    document.getElementById('accountDisplay').style.display = 'block';
    document.getElementById('functionContainer').style.display = 'block';
    document.getElementById('messageContainer').style.display = 'none';
}

function clearFunctionContainer() {
    document.getElementById('inputFields').innerHTML = '';
    document.getElementById('result').innerText = '';
    document.getElementById('result').style.display = 'none';
    submitButton.style.display = 'none';
}

function resetUI() {
    document.getElementById('connectWalletButton').style.display = 'block';
    document.getElementById('accountDisplay').style.display = 'none';
    document.getElementById('functionContainer').style.display = 'none';
    document.getElementById('messageContainer').style.display = 'none';
    document.getElementById('functionSelect').value = '';
    clearFunctionContainer();
}

async function handleAccountChange(accounts) {
    resetUI();

    if (accounts.length > 0) {
        const account = accounts[0];
        console.log('Connected account:', account);
        if (await handleNetworkCheck(account)) {
            setUI(account);
        } else {
            showWarning('Failed to switch networks. Please refresh the page to try again.');
        }
    }
}

let isConnecting = false;

async function connectWallet() {
    if (isConnecting) return; // Prevent multiple clicks
    isConnecting = true;

    const connectWalletButton = document.getElementById('connectWalletButton');
    connectWalletButton.disabled = true;

    showNotification('Sent request to wallet to login...');

    try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        await handleAccountChange(accounts);
    } catch (error) {
        console.error('Wallet connection failed', error);
        showWarning('Failed to connect to the wallet. Please try again.');
    } finally {
        isConnecting = false;
        connectWalletButton.disabled = false;
    }
}

async function loadABI() {
    try {
        const response = await fetch('abi.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading ABI:', error);
        return null;
    }
}

window.addEventListener('load', async () => {
    const connectWalletButton = document.getElementById('connectWalletButton');

    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', handleAccountChange);

        connectWalletButton.addEventListener('click', connectWallet);

        web3 = new Web3(window.ethereum);

        const contractABI = await loadABI();
        if (contractABI) {
            contract = new web3.eth.Contract(contractABI, contractAddress);

            const accounts = await web3.eth.getAccounts();
            await handleAccountChange(accounts);
        } else {
            connectWalletButton.disabled = true;
            showWarning('Unable to load contract ABI.');
        }
    } else {
        alert('No Ethereum wallet detected!');
        connectWalletButton.disabled = true;
        showWarning('No Ethereum wallet detected! Please install a Web3 wallet to connect.');
    }

    document.getElementById('functionSelect').addEventListener('change', handleFunctionSelect);
    document.getElementById('submitButton').addEventListener('click', handleTransaction);
});

const tokenSelectorHTML = `
    <label for="token">Select Token:</label>
    <select id="token">
        <option value="0">ProofOfUniqueHuman</option>
        <option value="1">Register</option>
        <option value="2">OptIn</option>
        <option value="3">BorderVote</option>
    </select>
`;

async function getCurrentSchedule() {
    const currentSchedule = await contract.methods.schedule().call();
    return parseInt(currentSchedule, 10);
}

async function getPeriodSelector(includePrevious, includeCurrent, includeNext) {
    const currentSchedule = await getCurrentSchedule();
    let options = `<label for="t">Select Period:</label><select id="t">`;

    // Only include Previous if currentSchedule is greater than 0
    if (includePrevious && currentSchedule > 0) {
        options += `<option value="${currentSchedule - 1}">Previous</option>`;
    }
    if (includeCurrent) {
        options += `<option value="${currentSchedule}" selected>Current</option>`;
    }
    if (includeNext) {
        options += `<option value="${currentSchedule + 1}">Next</option>`;
    }

    options += `</select>`;
    return options;
}

function generateRandomNumber() {
    let randomNumber = "";
    for (let i = 0; i < 64; i++) {
        const randomHexDigit = Math.floor(Math.random() * 16).toString(16);
        randomNumber += randomHexDigit;
    }
    return randomNumber;
}
                           
async function handleFunctionSelect() {
    const selectedFunction = document.getElementById('functionSelect').value;
    const inputFieldsDiv = document.getElementById('inputFields');
    const submitButton = document.getElementById('submitButton');
    clearFunctionContainer();

    // WRITE functions
    if (selectedFunction === 'register') {
        const randomNumber = generateRandomNumber();
        inputFieldsDiv.innerHTML = `
            <label for="randomNumber">Random Number (preimage):</label>
            <input type="text" id="randomNumber" placeholder="Enter random number" value="${randomNumber}" class="bytes32-input">
        `;
    } else if (selectedFunction === 'revealHash') {
        inputFieldsDiv.innerHTML = `
            <label for="preimage">Preimage:</label>
            <input type="text" id="preimage" placeholder="Enter hash preimage" class="bytes32-input">
        `;
    } else if (selectedFunction === 'dispute') {
        inputFieldsDiv.innerHTML = `
            <label for="early">Early Dispute?</label>
            <input type="checkbox" id="early">
        `;
    } else if (selectedFunction === 'reassignNym' || selectedFunction === 'reassignCourt') {
        inputFieldsDiv.innerHTML = `
            <label for="early">Early Reassign?</label>
            <input type="checkbox" id="early">
        `;
    } else if (selectedFunction === 'borderVote') {
        inputFieldsDiv.innerHTML = `
            <label for="target">Target:</label>
            <input type="text" id="target" placeholder="Enter target">
        `;
    } else if (selectedFunction === 'transfer') {
        inputFieldsDiv.innerHTML = `
            ${tokenSelectorHTML}
            <label for="to">Recipient Address:</label>
            <input type="text" id="to" placeholder="Enter recipient address" class="address-input">
            <label for="value">Value:</label>
            <input type="text" id="value" placeholder="Enter value (uint256)">
        `;
    } else if (selectedFunction === 'approve') {
        inputFieldsDiv.innerHTML = `
            ${tokenSelectorHTML}
            <label for="spender">Spender:</label>
            <input type="text" id="spender" placeholder="Enter spender address" class="address-input">
            <label for="value">Value:</label>
            <input type="text" id="value" placeholder="Enter value (uint256)">
        `;
    } else if (selectedFunction === 'transferFrom') {
        inputFieldsDiv.innerHTML = `
            ${tokenSelectorHTML}
            <label for="from">From Address:</label>
            <input type="text" id="from" placeholder="Enter sender address" class="address-input">
            <label for="to">Recipient Address:</label>
            <input type="text" id="to" placeholder="Enter recipient address" class="address-input">
            <label for="value">Value:</label>
            <input type="text" id="value" placeholder="Enter value (uint256)">
        `;

    // READ functions
    } else if (selectedFunction === 'balanceOf') {
        inputFieldsDiv.innerHTML = `
            ${tokenSelectorHTML}
            <label for="account">Account:</label>
            <input type="text" id="account" placeholder="Enter account address" class="address-input">
        `;
    } else if (selectedFunction === 'allowance') {
        inputFieldsDiv.innerHTML = `
            ${tokenSelectorHTML}
            <label for="owner">Owner Address:</label>
            <input type="text" id="owner" placeholder="Enter owner address" class="address-input">
            <label for="spender">Spender Address:</label>
            <input type="text" id="spender" placeholder="Enter spender address" class="address-input">
        `;
    } else if (selectedFunction === 'proofOfUniqueHuman') {
        inputFieldsDiv.innerHTML = `
            ${await getPeriodSelector(true, true, true)}
            <label for="account">Account:</label>
            <input type="text" id="account" placeholder="Enter account address" class="address-input">
        `;
    } else if (selectedFunction === 'population') {
        inputFieldsDiv.innerHTML = `
            ${await getPeriodSelector(true, true, true)}
        `;
    } else if (selectedFunction === 'getPair') {
        inputFieldsDiv.innerHTML = `
            <label for="id">Nym ID:</label>
            <input type="text" id="id" placeholder="Enter ID">
        `;
    } else if (selectedFunction === 'nym' || selectedFunction === 'shuffler' || selectedFunction === 'court' || selectedFunction === 'commit') {
        inputFieldsDiv.innerHTML = `
            ${await getPeriodSelector(true, true, false)}
            <label for="account">Account:</label>
            <input type="text" id="account" placeholder="Enter account address" class="address-input">
        `;
    } else if (selectedFunction === 'registry') {
        inputFieldsDiv.innerHTML = `
            ${await getPeriodSelector(true, true, false)}
            <label for="id">Registry ID:</label>
            <input type="text" id="id" placeholder="Enter ID">
        `;
    } else if (selectedFunction === 'registryLength' || selectedFunction === 'shuffled' || selectedFunction === 'courts' || selectedFunction === 'permits' || selectedFunction === 'seed') {
        inputFieldsDiv.innerHTML = `
            ${await getPeriodSelector(true, true, false)}
        `;
    }  else if (selectedFunction === 'pair') {
        inputFieldsDiv.innerHTML = `
            ${await getPeriodSelector(true, true, false)}
            <label for="id">ID:</label>
            <input type="number" id="id" min="0" placeholder="Enter pair ID (uint256)">
        `;
    } else if (selectedFunction === 'toSeconds' || selectedFunction === 'hour' || selectedFunction === 'pseudonymEvent') {
        inputFieldsDiv.innerHTML = `
            ${await getPeriodSelector(false, true, true)}
        `;
    }

    if (selectedFunction != '') {
        submitButton.style.display = 'block';
    }
}

async function handleTransaction() {
    const selectedFunction = document.getElementById('functionSelect').value;
    const accounts = await web3.eth.getAccounts();
    const fromAccount = accounts[0];
    const resultField = document.getElementById('result');

    try {
        const gasPrice = await web3.eth.getGasPrice();

        // WRITE functions
        if (selectedFunction === 'register') {
            const randomNumber = document.getElementById('randomNumber').value;
            const randomNumberHash = web3.utils.sha3('0x' + randomNumber);
            await contract.methods.register(randomNumberHash).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Register!';
        } else if (selectedFunction === 'optIn') {
            await contract.methods.optIn().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Opt In!';
        } else if (selectedFunction === 'shuffle') {
            await contract.methods.shuffle().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Shuffle!';
        } else if (selectedFunction === 'lateShuffle') {
            await contract.methods.lateShuffle().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Late Shuffle!';
        } else if (selectedFunction === 'verify') {
            await contract.methods.verify().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Verify!';
        } else if (selectedFunction === 'nymVerified') {
            await contract.methods.nymVerified().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Nym Verified!';
        } else if (selectedFunction === 'courtVerified') {
            await contract.methods.courtVerified().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Court Verified!';
        } else if (selectedFunction === 'revealHash') {
            const preimage = document.getElementById('preimage').value;
            await contract.methods.revealHash(preimage).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Reveal Hash!';
        } else if (selectedFunction === 'claimProofOfUniqueHuman') {
            await contract.methods.claimProofOfUniqueHuman().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Claim Proof-Of-Unique-Human!';
        } else if (selectedFunction === 'dispute') {
            const early = document.getElementById('early').checked;
            await contract.methods.dispute(early).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Dispute!';
        } else if (selectedFunction === 'reassignNym') {
            const early = document.getElementById('early').checked;
            await contract.methods.reassignNym(early).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Reassign Nym!';
        } else if (selectedFunction === 'reassignCourt') {
            const early = document.getElementById('early').checked;
            await contract.methods.reassignCourt(early).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Reassign Court!';
        } else if (selectedFunction === 'borderVote') {
            const target = document.getElementById('target').value;
            await contract.methods.borderVote(target).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Border Vote!';
        } else if (selectedFunction === 'transfer') {
            const token = document.getElementById('token').value;
            const to = document.getElementById('to').value;
            const value = document.getElementById('value').value;
            await contract.methods.transfer(to, value, token).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Transfer!';
        } else if (selectedFunction === 'approve') {
            const token = document.getElementById('token').value;
            const spender = document.getElementById('spender').value;
            const value = document.getElementById('value').value;
            await contract.methods.approve(spender, value, token).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Approve!';
        } else if (selectedFunction === 'transferFrom') {
            const token = document.getElementById('token').value;
            const from = document.getElementById('from').value;
            const to = document.getElementById('to').value;
            const value = document.getElementById('value').value;
            await contract.methods.transferFrom(token, from, to, value).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Transfer From!';

        // READ functions
        } else if (selectedFunction === 'balanceOf') {
            const t = await getCurrentSchedule();
            const token = document.getElementById('token').value;
            const account = document.getElementById('account').value;
            const result = await contract.methods.balanceOf(t, token, account).call();
            resultField.innerText = `Balance: ${result}`;
        } else if (selectedFunction === 'allowance') {
            const t = await getCurrentSchedule();
            const token = document.getElementById('token').value;
            const owner = document.getElementById('owner').value;
            const spender = document.getElementById('spender').value;
            const result = await contract.methods.allowance(t, token, owner, spender).call();
            resultField.innerText = `Allowance: ${result}`;
        } else if (selectedFunction === 'proofOfUniqueHuman') {
            const account = document.getElementById('account').value;
            const result = await contract.methods.proofOfUniqueHuman(t, account).call();
            resultField.innerText = `Proof Of Unique Human: ${result}`;
        } else if (selectedFunction === 'population') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.population(t).call();
            resultField.innerText = `Population: ${result}`;
        } else if (selectedFunction === 'getPair') {
            const id = document.getElementById('id').value;
            const result = await contract.methods.getPair(id).call();
            resultField.innerText = `Pair ID: ${result}`;
        } else if (selectedFunction === 'nym') {
            const t = document.getElementById('t').value;
            const account = document.getElementById('account').value;
            const result = await contract.methods.nym(t, account).call();
            resultField.innerText = `Nym Result: ${JSON.stringify(result)}`;
        } else if (selectedFunction === 'registry') {
            const t = document.getElementById('t').value;
            const id = document.getElementById('id').value;
            const result = await contract.methods.registry(t, id).call();
            resultField.innerText = `Registry Address: ${result}`;
        } else if (selectedFunction === 'registryLength') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.registry(t).call();
            resultField.innerText = `Registry Length: ${result}`;
        } else if (selectedFunction === 'shuffled') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.shuffled(t).call();
            resultField.innerText = `Shuffled: ${result}`;
	} else if (selectedFunction === 'shuffler') {
            const account = document.getElementById('account').value;
            const result = await contract.methods.shuffler(t, account).call();
            resultField.innerText = `Is Shuffler: ${result}`;
        } else if (selectedFunction === 'permits') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.permits(t).call();
            resultField.innerText = `Permits: ${result}`;
        } else if (selectedFunction === 'commit') {
            const account = document.getElementById('account').value;
            const result = await contract.methods.commit(t, account).call();
            resultField.innerText = `Commit: ${result}`;
        } else if (selectedFunction === 'seed') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.seed(t).call();
            resultField.innerText = `Seed: ${result}`;
        
        // SCHEDULE functions
        } else if (selectedFunction === 'schedule') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.schedule(t).call();
            resultField.innerText = `Schedule: ${result}`;
        } else if (selectedFunction === 'toSeconds') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.toSeconds(t).call();
            resultField.innerText = `To Seconds: ${result}`;
        } else if (selectedFunction === 'quarter') {
            const currentSchedule = await getCurrentSchedule();
            const result = await contract.methods.quarter(currentSchedule).call();
            resultField.innerText = `Quarter: ${result}`;
        } else if (selectedFunction === 'hour') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.hour(t).call();
            resultField.innerText = `Hour: ${result}`;
        } else if (selectedFunction === 'pseudonymEvent') {
            const t = document.getElementById('t').value;
            const result = await contract.methods.pseudonymEvent(t).call();
            resultField.innerText = `Pseudonym Event: ${result}`;
        }

    } catch (error) {
        console.error('Transaction failed:', error);
        resultField.innerText = 'Transaction failed: ' + error.message;
    }
    resultField.style.display = 'block';
}

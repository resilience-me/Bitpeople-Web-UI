let web3;
let contract;
const contractAddress = '0x0000000000000000000000000000000000000010';  // Your contract address
const chainID = 2013;  // Your custom network's chain ID as a number

// Hide function selector initially
document.getElementById('accountDisplay').style.display = 'none';  // Hide account display initially
document.getElementById('functionContainer').style.display = 'none';  // Hide function container initially

// Function to handle network addition
async function addCustomNetwork() {
    try {
        await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: `0x${chainID.toString(16).toUpperCase()}`, // Convert chainID to hex string
                chainName: 'Panarchy',
                rpcUrls: ['https://polytopia.org:8545'], // Your custom RPC URL
                nativeCurrency: {
                    name: 'GAS',
                    symbol: 'GAS', // Your currency symbol
                    decimals: 18,
                },
                blockExplorerUrls: ['https://scan.polytopia.org'], // Your updated block explorer URL
            }],
        });
    } catch (addError) {
        console.error('Failed to add network:', addError);
    }
}

// Function to check the network ID
async function checkNetwork() {
    const remoteChainID = Number(await web3.eth.getChainId());
    console.log('Current Chain ID:', remoteChainID); // Log for debugging
    return remoteChainID === chainID; // Return true if the network ID matches, otherwise false
}

async function handleNetworkCheck(account) {
    if (await checkNetwork()) {
        return true; // Network is correct
    }
    
    await promptNetworkSwitch(); // Prompt to switch networks
    // Check the network again after prompting the user
    return await checkNetwork(); // Return the result of the check
}

function setUI(account) {
    document.getElementById('connectWalletButton').style.display = 'none'; // Hide the connect button
    document.getElementById('accountDisplay').innerHTML = `Connected Account: <span class="truncated-address">${account}</span>`;
    document.getElementById('accountDisplay').style.display = 'block'; // Show the account display
    document.getElementById('functionContainer').style.display = 'block'; // Show the function container
    document.getElementById('networkWarning').style.display = 'none'; // Hide network warning if previously shown
}

function resetUI() {
    document.getElementById('connectWalletButton').style.display = 'block'; // Show the connect button
    document.getElementById('accountDisplay').style.display = 'none'; // Hide account display
    document.getElementById('functionContainer').style.display = 'none'; // Hide the function container
    document.getElementById('networkWarning').style.display = 'none'; // Hide network warning
    document.getElementById('functionSelect').value = ''; // Set to the default option
	clearFunctionContainer();
}

// Function to handle account changes
async function handleAccountChange(accounts) {
    resetUI();  // Reset the UI first

    if (accounts.length > 0) {
		const account = accounts[0];
        console.log('Connected account:', account);
        // Handle network check and update UI based on the result
        if (await handleNetworkCheck(account)) {
            setUI(account);
        } else {
            document.getElementById('networkWarning').innerText = `Failed to switch networks. Please refresh the page to try again.`;
        }
    }
}

// Wallet connection logic
async function connectWallet() {
    try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        await handleAccountChange(accounts); // Use the shared function for account handling
    } catch (error) {
        console.error('Wallet connection failed', error);
    }
}

async function promptNetworkSwitch() {
    document.getElementById('networkWarning').innerText = `A request is being sent to your wallet to switch to the correct network (Chain ID: ${chainID}).`;
    document.getElementById('networkWarning').style.display = 'block';

    try {
        await addCustomNetwork(); // Try adding the custom network
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${(chainID).toString(16).toUpperCase()}` }],
        });
    } catch (switchError) {
        console.error('Network switch failed:', switchError);
        // Optionally update the UI here if needed
    }
}

document.getElementById('connectWalletButton').addEventListener('click', async () => {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        await connectWallet();
    } else {
        alert('No Ethereum wallet detected!');
    }
});

// Fetch the ABI from the JSON file
async function loadABI() {
    try {
        const response = await fetch('abi.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading ABI:', error);
    }
}

// On page load
window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', handleAccountChange);

        web3 = new Web3(window.ethereum);

        const contractABI = await loadABI();
        if (contractABI) {
            contract = new web3.eth.Contract(contractABI, contractAddress);
        }

        const accounts = await web3.eth.getAccounts();
        await handleAccountChange(accounts); // Call the shared function if an account is already connected
    } else {
        alert('No Ethereum wallet detected!');
    }

    // Add event listener for the function selector and submit button
    document.getElementById('functionSelect').addEventListener('change', handleFunctionSelect);
    document.getElementById('submitButton').addEventListener('click', handleTransaction);
});

// Token selector constant
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
console.log(currentSchedule);
    return parseInt(currentSchedule, 10);
}

function getPeriodSelector(currentSchedule, includePrevious, includeCurrent, includeNext) {
    let options = `<label for="t">Select Period:</label><select id="t">`;

    if (includePrevious) {
        options += `<option value="${currentSchedule - 1}">Previous</option>`;
    }
    if (includeCurrent) {
        options += `<option value="${currentSchedule}" selected>Current</option>`;  // Default to Current
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

function clearFunctionContainer() {
    document.getElementById('inputFields').innerHTML = ''; // Clear previous inputs
    document.getElementById('result').innerText = ''; // Clear the result field
    document.getElementById('result').style.display = 'none'; // Hide the result field at the start
	submitButton.style.display = 'none';
}
                           
async function handleFunctionSelect() {
    const selectedFunction = document.getElementById('functionSelect').value;
    const inputFieldsDiv = document.getElementById('inputFields');
    const submitButton = document.getElementById('submitButton');
    clearFunctionContainer();

    if (selectedFunction === 'approve') {
        inputFieldsDiv.innerHTML = `
            ${tokenSelectorHTML} <!-- Token selector comes first now -->
            <label for="spender">Spender:</label>
            <input type="text" id="spender" placeholder="Enter spender address" class="address-input">
            <label for="value">Value:</label>
            <input type="text" id="value" placeholder="Enter value (uint256)">
        `;
    } else if (selectedFunction === 'balanceOf') {
        const currentSchedule = await getCurrentSchedule(); // Fetch the current schedule
        inputFieldsDiv.innerHTML = `
            ${getPeriodSelector(currentSchedule, false, true, true)} <!-- Preselector for Current and Next -->
            ${tokenSelectorHTML} <!-- Token selector -->
            <label for="account">Account:</label>
            <input type="text" id="account" placeholder="Enter account address" class="address-input">
        `;
    } else if (selectedFunction === 'transfer') {
        inputFieldsDiv.innerHTML = `
            ${tokenSelectorHTML} <!-- Token selector comes first now -->
            <label for="to">Recipient Address:</label>
            <input type="text" id="to" placeholder="Enter recipient address" class="address-input">
            <label for="value">Value:</label>
            <input type="text" id="value" placeholder="Enter value (uint256)">
        `;
    } else if (selectedFunction === 'court') {
        const currentSchedule = await getCurrentSchedule(); // Fetch the current schedule
        inputFieldsDiv.innerHTML = `
            ${getPeriodSelector(currentSchedule, true, true, false)} <!-- Preselector for Previous and Current -->
            <label for="account">Account:</label>
            <input type="text" id="account" placeholder="Enter account address" class="address-input">
        `;
    } else if (selectedFunction === 'register') {
        const randomNumber = generateRandomNumber(); // Generate the random number
        inputFieldsDiv.innerHTML = `
            <label for="randomNumber">Random Number (preimage):</label>
            <input type="text" id="randomNumber" placeholder="Enter random number" value="${randomNumber}" class="bytes32-input">
        `;
    } else if (selectedFunction === 'reassignCourt') {
        inputFieldsDiv.innerHTML = `
            <label for="early">Early Reassign?</label>
            <input type="checkbox" id="early">
        `;
    } else if (selectedFunction === 'reassignNym') {
        inputFieldsDiv.innerHTML = `
            <label for="early">Early Reassign?</label>
            <input type="checkbox" id="early">
        `;
    } else if (selectedFunction === 'dispute') {
        inputFieldsDiv.innerHTML = `
            <label for="early">Early Dispute?</label>
            <input type="checkbox" id="early">
        `;
    } else if (selectedFunction === 'borderVote') {
        inputFieldsDiv.innerHTML = `
            <label for="target">Target:</label>
            <input type="text" id="target" placeholder="Enter target" class="address-input">
        `;
    } else if (selectedFunction === 'allowance') {
        const currentSchedule = await getCurrentSchedule(); // Fetch the current schedule
        inputFieldsDiv.innerHTML = `
            ${getPeriodSelector(currentSchedule, false, true, true)} <!-- Preselector for Current and Next -->
            ${tokenSelectorHTML} <!-- Token selector -->
            <label for="owner">Owner Address:</label>
            <input type="text" id="owner" placeholder="Enter owner address" class="address-input">
            <label for="spender">Spender Address:</label>
            <input type="text" id="spender" placeholder="Enter spender address" class="address-input">
        `;
    } else if (selectedFunction === 'getPair') {
        inputFieldsDiv.innerHTML = `
            <label for="id">Pair ID:</label>
            <input type="text" id="id" placeholder="Enter ID"> <!-- Removed address-input class -->
        `;
    } else if (selectedFunction === 'commit') {
        inputFieldsDiv.innerHTML = `
            <label for="account">Account:</label>
            <input type="text" id="account" placeholder="Enter account address" class="address-input">
        `;
    } else if (selectedFunction === 'registry') {
        inputFieldsDiv.innerHTML = `
            <label for="id">Registry ID:</label>
            <input type="text" id="id" placeholder="Enter ID"> <!-- Removed address-input class -->
        `;
    } else if (selectedFunction === 'shuffler') {
        inputFieldsDiv.innerHTML = `
            <label for="account">Account:</label>
            <input type="text" id="account" placeholder="Enter account address" class="address-input">
        `;
    } else if (selectedFunction === 'proofOfUniqueHuman') {
        inputFieldsDiv.innerHTML = `
            <label for="account">Account:</label>
            <input type="text" id="account" placeholder="Enter account address" class="address-input">
        `;
    } else if (selectedFunction === 'hour' || selectedFunction === 'pseudonymEvent' || selectedFunction === 'toSeconds') {
        inputFieldsDiv.innerHTML = `
            <label for="t">T:</label>
            <input type="text" id="t" placeholder="Enter value"> <!-- Removed address-input class -->
        `;
    }

	if (selectedFunction != '') {
        // Show the submit button
        submitButton.style.display = 'block';
    }
}

async function handleTransaction() {
    const selectedFunction = document.getElementById('functionSelect').value;
    const accounts = await web3.eth.getAccounts();
    const fromAccount = accounts[0];
    const resultField = document.getElementById('result'); // Constant for the result field

    try {
        const gasPrice = await web3.eth.getGasPrice(); // Fetch current gas price

        if (selectedFunction === 'approve') {
            const token = document.getElementById('token').value;  // Get token first
            const spender = document.getElementById('spender').value;
            const value = document.getElementById('value').value;
            await contract.methods.approve(spender, value, token).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Approve!';
        } else if (selectedFunction === 'balanceOf') {
            const t = document.getElementById('t').value;
            const token = document.getElementById('token').value;  // Get selected token
            const account = document.getElementById('account').value;
            const result = await contract.methods.balanceOf(t, token, account).call();
            resultField.innerText = `Balance: ${result}`;
        } else if (selectedFunction === 'transfer') {
            const token = document.getElementById('token').value;  // Get selected token first
            const to = document.getElementById('to').value;
            const value = document.getElementById('value').value;
            await contract.methods.transfer(to, value, token).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Transfer!';
        } else if (selectedFunction === 'court') {
            const t = document.getElementById('t').value;
            const account = document.getElementById('account').value;
            const result = await contract.methods.court(t, account).call();
            resultField.innerText = `Court Result: ${JSON.stringify(result)}`;
        } else if (selectedFunction === 'register') {
            const randomNumber = document.getElementById('randomNumber').value; // Get the random number from input
            const randomNumberHash = web3.utils.sha3('0x' + randomNumber); // Calculate the hash
            await contract.methods.register(randomNumberHash).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Register!';
        } else if (selectedFunction === 'reassignCourt') {
            const early = document.getElementById('early').checked;  // Boolean from checkbox
            await contract.methods.reassignCourt(early).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Reassign Court!';
        } else if (selectedFunction === 'allowance') {
            const t = document.getElementById('t').value;
            const token = document.getElementById('token').value;  // Token comes after schedule
            const owner = document.getElementById('owner').value;
            const spender = document.getElementById('spender').value;
            const result = await contract.methods.allowance(t, token, owner, spender).call();
            resultField.innerText = `Allowance: ${result}`;
        } else if (selectedFunction === 'dispute') {
            const early = document.getElementById('early').checked;  // Boolean from checkbox
            await contract.methods.dispute(early).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Dispute!';
        } else if (selectedFunction === 'optIn') {
            await contract.methods.optIn().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for OptIn!';
        } else if (selectedFunction === 'nymVerified') {
            await contract.methods.nymVerified().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for NymVerified!';
        } else if (selectedFunction === 'courtVerified') {
            await contract.methods.courtVerified().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for CourtVerified!';
        } else if (selectedFunction === 'claimProofOfUniqueHuman') {
            await contract.methods.claimProofOfUniqueHuman().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Claim Proof of Unique Human!';
        } else if (selectedFunction === 'shuffle') {
            await contract.methods.shuffle().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Shuffle!';
        } else if (selectedFunction === 'lateShuffle') {
            await contract.methods.lateShuffle().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Late Shuffle!';
        } else if (selectedFunction === 'verify') {
            await contract.methods.verify().send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Verify!';
        } else if (selectedFunction === 'reassignNym') {
            const early = document.getElementById('early').checked;  // Boolean from checkbox
            await contract.methods.reassignNym(early).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Reassign Nym!';
        } else if (selectedFunction === 'borderVote') {
            const target = document.getElementById('target').value;
            await contract.methods.borderVote(target).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Border Vote!';
        } else if (selectedFunction === 'revealHash') {
            const preimage = document.getElementById('preimage').value;
            await contract.methods.revealHash(preimage).send({ from: fromAccount, gasPrice });
            resultField.innerText = 'Transaction successful for Reveal Hash!';
        }
    } catch (error) {
        console.error('Transaction failed:', error);
        resultField.innerText = 'Transaction failed: ' + error.message;
    }
        resultField.style.display = 'block'; // Show the result field
}

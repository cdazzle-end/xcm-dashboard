<template>
  <!-- <img alt="Vue logo" src="./assets/logo.png"> -->
  <!-- <HelloWorld msg="Welcome to Your Vue.js App"/> -->
   <div>
    
      <button v-if="!selectedAccount && !accounts.length" @click="connectWallet">Show Accounts</button>
       <!-- List of accounts to select from -->
      <ul v-if="!selectedAccount && accounts.length">
        <h3>Select an account: </h3>
        <li v-for="account in accounts" :key="account.address" @click="selectAccount(account)">
          {{ account.meta.name }} - {{ account.address }}
        </li>
      </ul>

      <!-- Display the selected account -->
      <div v-if="selectedAccount">
        <p>Selected Account: {{ selectedAccount.meta.name }} ({{ selectedAccount.address }})</p>
        <!-- Add a button to clear the selected account if you wish -->
        <button @click="selectedAccount = null; accounts = [];">Change Account</button>
        
      </div>
      <div v-if="selectedAccount">
        <select v-model="selectedParachain" @change="onParachainSelected">
          <option v-for="parachain in allParachainsWithData" :key="parachain.id" :value="parachain">
            {{ parachain.text }}
          </option>
        </select>
      </div>
      <!-- <div v-if="account">
        <p>Account: {{ account.address }}</p>
        <p>Balance: {{ balance }}</p>
      </div>
      <button v-else @click="connectWallet">Connect Wallet</button> -->
    </div>
</template>

<script>
// import HelloWorld from './components/HelloWorld.vue'
import { web3Enable, web3Accounts } from '@polkadot/extension-dapp';
import { ApiPromise, WsProvider } from '@polkadot/api';
import assetRegistry from '@/assets/allAssets.json';
import { prodParasKusama, prodParasKusamaCommon, prodRelayKusama } from '@/assets/productionRelayKusama.ts';

export default {
  name: 'WalletConnector',
  data() {
    return {
      account: null,
      balance: null,
      accounts: [],
      selectedAccount: null,
      assetRegistry: assetRegistry,
      allParachains: [],
      allParachainsWithData: [],
      mainParachains: [],
      selectedParachain: null, // This will hold the selected value
    };
  },
  components: {
    // HelloWorld
  },
  methods: {
    async connectWallet() {
      const extensions = await web3Enable('My XCM Dashboard');
      if (extensions.length === 0) {
        // No extension installed, or the user did not accept the authorization request
        return;
      }
      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        // No accounts available
        return;
      }
      // this.accounts = accounts.map(account => ({ ...account, address: account.address }));
      // Use the first account for this example
      this.account = accounts[0];
      this.accounts = accounts;
      // Now retrieve the balance
      await this.getBalance();
    },
    
    async getAllParachains() {
      let parachains = this.assetRegistry.map((asset) => this.findValueByKey(asset.tokenLocation, "Parachain"));
      let mainParachains = this.assetRegistry.map((asset) => this.findValueByKey(asset.tokenData, "chain"));
      parachains = await Promise.all(parachains)
      mainParachains = await Promise.all(mainParachains)
      const uniqueChains = [...new Set(parachains)].filter((chain) => chain !== null);
      const uniqueMainChains = [...new Set(mainParachains)].filter((chain) => chain !== null).filter((chain) => typeof chain !== 'string');
      this.allParachains = uniqueChains;
      this.mainParachains = uniqueMainChains;
      return uniqueChains;
    },
    // Match this.allParachains to their data objects from production relay chain
    async setAssetRegistryParachainData() {
      this.allParachains.forEach((parachain) => {
        let parachainData = prodParasKusama.find((prodPara) => {
          if (prodPara.paraId === Number(parachain)) {
            return true;
          }
        })
        if(!parachainData) {
          parachainData = prodParasKusamaCommon.find((prodPara) => {
            if (prodPara.paraId === Number(parachain)) {
              return true;
            }
          })
        }
        if(!parachainData) {
          parachainData = prodRelayKusama
        }
        
        console.log("Parachain: " + parachain + " - Parachain Name: " + parachainData.text);
        // this.allParachains.push({id: parachain, name: parachainData.text})
        this.allParachainsWithData.push(parachainData)
      })   
    },
    // Get all assets with a multilocation from our registry for a given chain. These are the assets that can be sent to this chain.
    async getAssetsOriginatingFromChain(targetParaId) {
      console.log("Target parachain: " + targetParaId)
      let matchedAssets = this.assetRegistry.filter(async(asset) => {
        let assetParaId = await this.findValueByKey(asset.tokenLocation, "Parachain")
        // console.log(assetParaId)
        // console.log("assetParaId: " + assetParaId + " - targetParaId: " + targetParaId)

        if (Number(assetParaId) === targetParaId) {
          // console.log(asset.tokenName);
          // console.log("Asset: " + assetParaId + " - Target: " + targetParaId)
          console.log("asset")
          console.log(asset)
          return true;
        }
      })
      matchedAssets = await Promise.all(matchedAssets);
      console.log("Assets for chain: " + targetParaId)
      matchedAssets = matchedAssets.filter((asset) => asset.hasLocation !== false)
      matchedAssets.forEach((asset) => {
        console.log(asset.tokenData.name)
      })
    },
    // Get all assets registered on specific chain that have a multilocation. These are the assets that can be sent from this chain.
    async getAssetsRegisteredOnChain(targetParaId) {
      
    },
    async onParachainSelected() {
      // Function logic here
      // this.selectedParachain is already set due to v-model binding
      console.log('Selected parachain:', this.selectedParachain.text);
      await this.getAssetsOriginatingFromChain(this.selectedParachain.paraId)
    },

    // Lists all parachain ids and names for the production relay chain
    async getParachainIdToName() {
      prodParasKusama.forEach((parachain) => {
        console.log(parachain.paraId + " : " + parachain.text);
      })  
    },
    selectAccount(account) {
      this.selectedAccount = account;
    },
    async getBalance() {
      // Connect to the chain
      const api = await ApiPromise.create({
        provider: new WsProvider('wss://kusama-rpc.polkadot.io/'),
      });

      // Get the injector for the selected account
      // const injector = await web3FromSource(this.account.meta.source);

      // Use the account address and injector to query the balance
      let { data: { free: balance } } = await api.query.system.account(this.account.address);

      // Format the balance
      this.balance = api.createType('Balance', balance).toHuman();
    },
    async findValueByKey(obj, targetKey) {
      if (typeof obj !== 'object' || obj === null) {
        return null;
      }
      for (let key in obj) {
        if (key === targetKey) {
          return obj[key];
        }

        let foundValue = await this.findValueByKey(obj[key], targetKey);
        if (foundValue !== null) {
          return foundValue;
        }
      }
      return null;
    },
    

  },
  async mounted() {
    this.connectWallet();
    // this.assetRegistry.forEach((asset) => {
    //   console.log(asset);
    // });
    await this.getAllParachains();
    // this.getParachainIdToName();
    this.setAssetRegistryParachainData();
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

import fs from 'fs';
import path from 'path';
import { prodParasKusama } from './productionRelayKusama';

const chainMapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, './chainMapping.json'), 'utf8'));

async function run() {
    console.log(chainMapping)
    let chains = Object.keys(chainMapping);
    // console.log(chains)
    chains.forEach((chain) => {
        prodParasKusama.find((item) => {
            if (Number(chain) == item.paraId) {
                console.log(chain)
                console.log(item)
            }
        })
    })
    prodParasKusama.forEach((item) => {

    })

}

run()
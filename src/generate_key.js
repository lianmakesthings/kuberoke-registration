const crypto = require('crypto')

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 512 });

console.log(publicKey.export({format: 'pem', type: 'spki'}))
console.log(privateKey.export({type:'pkcs8', format: 'pem'}).split('\n').join('\\n'))
// corraline.js, n8n Code node icinde calisacak sekilde yazilmistir (module.exports
// KULLANMAZ, cunku n8n'in calistirma ortaminda 'module' tanimli degildir ve bunu
// eklemek n8n'deki gercek calismayi bozar). Bu yuzden test icin kaynagi degistirmek
// yerine, dosyayi bir vm baglaminda calistirip ust-seviye function tanimlarini
// (hoisting sayesinde) dogrudan test edilebilir hale getiriyoruz.
//
// Dosyanin en altindaki 'ANA MANTIK' bolumu $() olmadan calisirken hata firlatir
// (bu, n8n disinda beklenen ve zararsiz bir durumdur) - fonksiyon tanimlari zaten
// bu noktaya gelmeden once sandbox'a yazilmis olur.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadCorraline() {
  let code = fs.readFileSync(path.join(__dirname, '../../src/corraline.js'), 'utf8');
  // corraline.js, n8n'in Code node'unu calistirma bicimine (kodu bir fonksiyon govdesi
  // gibi calistirip en sonda 'return' bekler) uygun yazilmistir. Bunu ham bir vm script'i
  // olarak (fonksiyon sarmali OLMADAN) calistirdigimizda, en sondaki ust-seviye 'return'
  // bir SyntaxError'a yol acar (derleme asamasinda), bu da TUM fonksiyon tanimlarinin
  // hoisting'ini engeller. Bu SADECE test yukleyicisindeki bellek-ici kopyada, kaynagi
  // hic degistirmeden, o tek satiri zararsiz bir ifadeye ceviriyoruz.
  code = code.replace(/\nreturn \[\{ json: output \}\];\s*$/, '\n[{ json: output }];');
  const sandbox = { console };
  vm.createContext(sandbox);
  try {
    vm.runInContext(code, sandbox);
  } catch (e) {
    // Beklenen: ana mantik bolumu $() stub'i olmadan burada hata verir; fonksiyon
    // tanimlari bu noktaya gelmeden once zaten hoisting ile sandbox'a yazilmis olur.
  }
  return sandbox;
}

module.exports = { loadCorraline };

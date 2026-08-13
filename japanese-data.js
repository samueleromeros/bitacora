// japanese-data.js — Referencia estática de caracteres (no depende de lo que subas).
'use strict';

// ---------- HIRAGANA ----------
const HIRAGANA_GROUPS = [
  { label: 'Vocales', chars: [
    ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o']
  ]},
  { label: 'K', chars: [
    ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko']
  ]},
  { label: 'S', chars: [
    ['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so']
  ]},
  { label: 'T', chars: [
    ['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to']
  ]},
  { label: 'N', chars: [
    ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no']
  ]},
  { label: 'H', chars: [
    ['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho']
  ]},
  { label: 'M', chars: [
    ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo']
  ]},
  { label: 'Y', chars: [
    ['や','ya'],['ゆ','yu'],['よ','yo']
  ]},
  { label: 'R', chars: [
    ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro']
  ]},
  { label: 'W / N', chars: [
    ['わ','wa'],['を','wo'],['ん','n']
  ]},
  { label: 'Dakuten G/Z', chars: [
    ['が','ga'],['ぎ','gi'],['ぐ','gu'],['げ','ge'],['ご','go'],
    ['ざ','za'],['じ','ji'],['ず','zu'],['ぜ','ze'],['ぞ','zo']
  ]},
  { label: 'Dakuten D/B', chars: [
    ['だ','da'],['ぢ','ji'],['づ','zu'],['で','de'],['ど','do'],
    ['ば','ba'],['び','bi'],['ぶ','bu'],['べ','be'],['ぼ','bo']
  ]},
  { label: 'Handakuten P', chars: [
    ['ぱ','pa'],['ぴ','pi'],['ぷ','pu'],['ぺ','pe'],['ぽ','po']
  ]},
  { label: 'Yōon (きゃ...)', chars: [
    ['きゃ','kya'],['きゅ','kyu'],['きょ','kyo'],
    ['しゃ','sha'],['しゅ','shu'],['しょ','sho'],
    ['ちゃ','cha'],['ちゅ','chu'],['ちょ','cho'],
    ['にゃ','nya'],['にゅ','nyu'],['にょ','nyo'],
    ['ひゃ','hya'],['ひゅ','hyu'],['ひょ','hyo'],
    ['みゃ','mya'],['みゅ','myu'],['みょ','myo'],
    ['りゃ','rya'],['りゅ','ryu'],['りょ','ryo']
  ]},
  { label: 'Yōon con dakuten', chars: [
    ['ぎゃ','gya'],['ぎゅ','gyu'],['ぎょ','gyo'],
    ['じゃ','ja'],['じゅ','ju'],['じょ','jo'],
    ['びゃ','bya'],['びゅ','byu'],['びょ','byo'],
    ['ぴゃ','pya'],['ぴゅ','pyu'],['ぴょ','pyo']
  ]},
  { label: 'Símbolos', chars: [
    ['っ','sokuon (duplica la consonante siguiente)']
  ]}
];

// ---------- KATAKANA ----------
const KATAKANA_GROUPS = [
  { label: 'Vocales', chars: [
    ['ア','a'],['イ','i'],['ウ','u'],['エ','e'],['オ','o']
  ]},
  { label: 'K', chars: [
    ['カ','ka'],['キ','ki'],['ク','ku'],['ケ','ke'],['コ','ko']
  ]},
  { label: 'S', chars: [
    ['サ','sa'],['シ','shi'],['ス','su'],['セ','se'],['ソ','so']
  ]},
  { label: 'T', chars: [
    ['タ','ta'],['チ','chi'],['ツ','tsu'],['テ','te'],['ト','to']
  ]},
  { label: 'N', chars: [
    ['ナ','na'],['ニ','ni'],['ヌ','nu'],['ネ','ne'],['ノ','no']
  ]},
  { label: 'H', chars: [
    ['ハ','ha'],['ヒ','hi'],['フ','fu'],['ヘ','he'],['ホ','ho']
  ]},
  { label: 'M', chars: [
    ['マ','ma'],['ミ','mi'],['ム','mu'],['メ','me'],['モ','mo']
  ]},
  { label: 'Y', chars: [
    ['ヤ','ya'],['ユ','yu'],['ヨ','yo']
  ]},
  { label: 'R', chars: [
    ['ラ','ra'],['リ','ri'],['ル','ru'],['レ','re'],['ロ','ro']
  ]},
  { label: 'W / N', chars: [
    ['ワ','wa'],['ヲ','wo'],['ン','n']
  ]},
  { label: 'Dakuten G/Z', chars: [
    ['ガ','ga'],['ギ','gi'],['グ','gu'],['ゲ','ge'],['ゴ','go'],
    ['ザ','za'],['ジ','ji'],['ズ','zu'],['ゼ','ze'],['ゾ','zo']
  ]},
  { label: 'Dakuten D/B', chars: [
    ['ダ','da'],['ヂ','ji'],['ヅ','zu'],['デ','de'],['ド','do'],
    ['バ','ba'],['ビ','bi'],['ブ','bu'],['ベ','be'],['ボ','bo']
  ]},
  { label: 'Handakuten P', chars: [
    ['パ','pa'],['ピ','pi'],['プ','pu'],['ペ','pe'],['ポ','po']
  ]},
  { label: 'Yōon (キャ...)', chars: [
    ['キャ','kya'],['キュ','kyu'],['キョ','kyo'],
    ['シャ','sha'],['シュ','shu'],['ショ','sho'],
    ['チャ','cha'],['チュ','chu'],['チョ','cho'],
    ['ニャ','nya'],['ニュ','nyu'],['ニョ','nyo'],
    ['ヒャ','hya'],['ヒュ','hyu'],['ヒョ','hyo'],
    ['ミャ','mya'],['ミュ','myu'],['ミョ','myo'],
    ['リャ','rya'],['リュ','ryu'],['リョ','ryo']
  ]},
  { label: 'Yōon con dakuten', chars: [
    ['ギャ','gya'],['ギュ','gyu'],['ギョ','gyo'],
    ['ジャ','ja'],['ジュ','ju'],['ジョ','jo'],
    ['ビャ','bya'],['ビュ','byu'],['ビョ','byo'],
    ['ピャ','pya'],['ピュ','pyu'],['ピョ','pyo']
  ]},
  { label: 'Extendido (préstamos extranjeros)', chars: [
    ['ファ','fa'],['フィ','fi'],['フェ','fe'],['フォ','fo'],
    ['ティ','ti'],['ディ','di'],['トゥ','tu'],['ドゥ','du'],
    ['ウィ','wi'],['ウェ','we'],['ウォ','wo'],
    ['ジェ','je'],['チェ','che'],['シェ','she'],
    ['ツァ','tsa'],['ツェ','tse'],['ツォ','tso'],['ヴ','vu']
  ]},
  { label: 'Símbolos', chars: [
    ['ッ','sokuon (duplica la consonante siguiente)'],['ー','alarga la vocal anterior']
  ]}
];

// ---------- KANJI N5 (nivel básico) ----------
// Lista curada de kanji comunes de nivel introductorio. No es una lista oficial
// certificada del JLPT, pero cubre el vocabulario básico habitual de este nivel.
const KANJI_N5_GROUPS = [
  { label: 'Números', chars: [
    ['一','ichi / hito(tsu)','uno'],['二','ni / futa(tsu)','dos'],['三','san / mit(tsu)','tres'],
    ['四','shi/yon','cuatro'],['五','go / itsu(tsu)','cinco'],['六','roku','seis'],
    ['七','shichi/nana','siete'],['八','hachi','ocho'],['九','kyuu/ku','nueve'],
    ['十','juu / too','diez'],['百','hyaku','cien'],['千','sen','mil'],['万','man','diez mil']
  ]},
  { label: 'Tiempo', chars: [
    ['円','en','yen (moneda)'],['日','nichi / hi','día / sol'],['月','getsu / tsuki','mes / luna'],
    ['火','ka / hi','fuego'],['水','sui / mizu','agua'],['木','moku / ki','árbol'],
    ['金','kin / kane','dinero / metal'],['土','do / tsuchi','tierra'],['曜','you','día de la semana'],
    ['年','nen / toshi','año'],['時','ji / toki','hora'],['分','fun/bun','minuto'],
    ['半','han','mitad'],['今','kon / ima','ahora'],['先','sen','antes / previo'],['週','shuu','semana']
  ]},
  { label: 'Naturaleza', chars: [
    ['山','san / yama','montaña'],['川','sen / kawa','río'],['天','ten','cielo'],
    ['空','kuu / sora','cielo vacío'],['雨','u / ame','lluvia'],['花','ka / hana','flor'],
    ['雪','setsu / yuki','nieve']
  ]},
  { label: 'Personas', chars: [
    ['人','jin/nin / hito','persona'],['男','dan / otoko','hombre'],['女','jo / onna','mujer'],
    ['子','shi / ko','niño/a'],['名','mei / na','nombre'],['私','shi / watashi','yo'],
    ['友','yuu / tomo','amigo'],['父','fu / chichi','padre'],['母','bo / haha','madre'],
    ['兄','kei / ani','hermano mayor'],['姉','shi / ane','hermana mayor'],
    ['弟','tei / otouto','hermano menor'],['妹','mai / imouto','hermana menor'],
    ['家','ka / ie','casa / familia']
  ]},
  { label: 'Lugares', chars: [
    ['国','koku / kuni','país'],['学','gaku','estudio'],['校','kou','escuela'],
    ['社','sha','compañía / templo'],['店','ten / mise','tienda'],['駅','eki','estación'],
    ['道','dou / michi','camino']
  ]},
  { label: 'Direcciones / tamaño', chars: [
    ['上','jou / ue','arriba'],['下','ka / shita','abajo'],['中','chuu / naka','dentro / medio'],
    ['外','gai / soto','afuera'],['前','zen / mae','antes / adelante'],['後','go / ushiro','después / atrás'],
    ['左','sa / hidari','izquierda'],['右','u / migi','derecha'],['北','hoku / kita','norte'],
    ['南','nan / minami','sur'],['東','tou / higashi','este'],['西','sei / nishi','oeste'],
    ['大','dai / oo(kii)','grande'],['小','shou / chii(sai)','pequeño']
  ]},
  { label: 'Colores', chars: [
    ['白','haku / shiro','blanco'],['黒','koku / kuro','negro'],['赤','seki / aka','rojo'],
    ['青','sei / ao','azul']
  ]},
  { label: 'Verbos comunes', chars: [
    ['行','kou / i(ku)','ir'],['来','rai / ku(ru)','venir'],['帰','ki / kae(ru)','regresar'],
    ['出','shutsu / de(ru)','salir'],['入','nyuu / hai(ru)','entrar'],['立','ritsu / ta(tsu)','pararse'],
    ['休','kyuu / yasu(mu)','descansar'],['見','ken / mi(ru)','ver'],['聞','bun / ki(ku)','oír / preguntar'],
    ['読','doku / yo(mu)','leer'],['書','sho / ka(ku)','escribir'],['話','wa / hana(su)','hablar'],
    ['言','gen / i(u)','decir'],['食','shoku / ta(beru)','comer'],['飲','in / no(mu)','beber'],
    ['買','bai / ka(u)','comprar'],['売','bai / u(ru)','vender'],['作','saku / tsuku(ru)','hacer/crear']
  ]},
  { label: 'Cuerpo y salud', chars: [
    ['目','moku / me','ojo'],['耳','ji / mimi','oreja'],['口','kou / kuchi','boca'],
    ['手','shu / te','mano'],['足','soku / ashi','pie/pierna'],['体','tai / karada','cuerpo']
  ]},
  { label: 'Otros comunes', chars: [
    ['語','go','idioma'],['文','bun','texto/oración'],['字','ji','carácter/letra'],
    ['本','hon','libro/origen'],['車','sha / kuruma','auto'],['電','den','electricidad'],
    ['新','shin / atara(shii)','nuevo'],['古','ko / furu(i)','viejo']
  ]}
];

window.HIRAGANA_GROUPS = HIRAGANA_GROUPS;
window.KATAKANA_GROUPS = KATAKANA_GROUPS;
window.KANJI_N5_GROUPS = KANJI_N5_GROUPS;

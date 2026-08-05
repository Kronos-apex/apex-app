// Lista CURADA: qué alimentos de la base gringa entran, con su nombre en español.
// Regla de selección: `q` = palabras que la descripción DEBE traer · `no` = las que la descartan ·
// `cat` = categoría USDA (evita que «pollo» caiga en embutidos) · `porc` = qué medida casera usar
// (los GRAMOS los pone la USDA, nunca yo) · `label` = cómo se le dice a esa medida en español.
// NO se repite nada de los 50 curados que ya existen.
export const CURADA = [
  // ── PROTEÍNA ANIMAL ────────────────────────────────────────────────────────
  { es: 'Salmón', q: ['salmon', 'atlantic', 'raw'], no: ['smoked'], cat: 'Finfish and Shellfish Products', porc: 'fillet', label: 'filete' },
  { es: 'Sardina en aceite (escurrida)', q: ['sardine', 'atlantic', 'canned'], cat: 'Finfish and Shellfish Products', porc: 'cup', label: 'lata' },
  { es: 'Camarón cocido', q: ['shrimp', 'cooked'], no: ['breaded', 'fried', 'imitation'], cat: 'Finfish and Shellfish Products', porc: 'oz', label: 'porción' },
  { es: 'Bagre', q: ['catfish', 'raw'], no: ['breaded'], cat: 'Finfish and Shellfish Products', porc: 'fillet', label: 'filete' },
  { es: 'Trucha', q: ['trout', 'raw'], no: ['smoked'], cat: 'Finfish and Shellfish Products', porc: 'fillet', label: 'filete' },
  { es: 'Pechuga de pavo', q: ['turkey', 'breast', 'meat only', 'raw'], cat: 'Poultry Products', porc: 'oz', label: 'porción' },
  { es: 'Hígado de res', q: ['beef', 'liver', 'raw'], cat: 'Beef Products', porc: 'oz', label: 'porción' },
  { es: 'Costilla de cerdo', q: ['pork', 'spareribs', 'raw'], cat: 'Pork Products', porc: 'oz', label: 'porción' },
  { es: 'Chuleta de cerdo', fdc: '167839', q: ['pork'], porc: 'oz', label: 'chuleta' },
  { es: 'Tocineta', fdc: '167914', q: ['bacon'], porc: 'slice', label: 'tajada' },
  { es: 'Jamón', fdc: '173864', q: ['ham'], porc: 'slice', label: 'tajada' },
  { es: 'Salchicha', q: ['frankfurter', 'beef'], no: ['low fat', 'fat free'], cat: 'Sausages and Luncheon Meats', porc: 'frankfurter', label: 'salchicha' },
  { es: 'Chorizo', q: ['chorizo'], cat: 'Sausages and Luncheon Meats', porc: 'link', label: 'chorizo' },
  { es: 'Atún en aceite (escurrido)', q: ['tuna', 'canned', 'oil', 'drained'], cat: 'Finfish and Shellfish Products', porc: 'cup', label: 'lata' },
  // ── LÁCTEOS Y HUEVO ────────────────────────────────────────────────────────
  { es: 'Queso mozzarella', q: ['cheese', 'mozzarella', 'whole milk'], no: ['nonfat', 'low', 'part skim'], cat: 'Dairy and Egg Products', porc: 'oz', label: 'porción' },
  { es: 'Queso cheddar', q: ['cheese', 'cheddar'], no: ['low', 'nonfat', 'sauce', 'spread'], cat: 'Dairy and Egg Products', porc: 'oz', label: 'tajada' },
  { es: 'Requesón', q: ['cheese', 'ricotta', 'whole milk'], cat: 'Dairy and Egg Products', porc: 'cup', label: 'porción' },
  { es: 'Leche entera', q: ['milk', 'whole', '3.25%'], no: ['chocolate', 'dry', 'evaporated'], cat: 'Dairy and Egg Products', porc: 'cup', label: 'vaso' },
  { es: 'Leche descremada', q: ['milk', 'nonfat', 'fluid'], no: ['dry', 'chocolate', 'evaporated'], cat: 'Dairy and Egg Products', porc: 'cup', label: 'vaso' },
  { es: 'Yogur natural entero', q: ['yogurt', 'plain', 'whole milk'], cat: 'Dairy and Egg Products', porc: 'cup', label: 'vaso' },
  { es: 'Kumis o yogur de beber', q: ['milk', 'buttermilk', 'fluid'], no: ['dried'], cat: 'Dairy and Egg Products', porc: 'cup', label: 'vaso' },
  { es: 'Mantequilla', q: ['butter', 'salted'], no: ['whipped', 'oil'], cat: 'Dairy and Egg Products', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Crema de leche', q: ['cream', 'heavy whipping'], cat: 'Dairy and Egg Products', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Huevo cocido', q: ['egg', 'whole', 'hard-boiled'], cat: 'Dairy and Egg Products', porc: 'large', label: 'huevo' },
  { es: 'Huevo frito', q: ['egg', 'whole', 'fried'], cat: 'Dairy and Egg Products', porc: 'large', label: 'huevo' },
  // ── LEGUMBRES Y VEGETALES PROTEICOS ────────────────────────────────────────
  { es: 'Arveja verde cocida', q: ['peas', 'green', 'cooked', 'boiled'], no: ['split', 'edible'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Fríjol blanco cocido', q: ['beans', 'white', 'mature', 'cooked'], cat: 'Legumes and Legume Products', porc: 'cup', label: 'taza' },
  { es: 'Fríjol negro cocido', q: ['beans', 'black', 'mature', 'cooked'], cat: 'Legumes and Legume Products', porc: 'cup', label: 'taza' },
  { es: 'Haba cocida', q: ['broadbeans', 'fava', 'cooked'], cat: 'Legumes and Legume Products', porc: 'cup', label: 'taza' },
  { es: 'Soya cocida', q: ['soybeans', 'mature', 'cooked'], no: ['sprouted'], cat: 'Legumes and Legume Products', porc: 'cup', label: 'taza' },
  { es: 'Tofu', q: ['tofu', 'raw', 'firm'], cat: 'Legumes and Legume Products', porc: 'cup', label: 'porción' },
  // ── CEREALES Y TUBÉRCULOS ──────────────────────────────────────────────────
  { es: 'Arroz integral cocido', q: ['rice', 'brown', 'long-grain', 'cooked'], no: ['uncle'], cat: 'Cereal Grains and Pasta', porc: 'cup', label: 'taza' },
  { es: 'Quinua cocida', q: ['quinoa', 'cooked'], cat: 'Cereal Grains and Pasta', porc: 'cup', label: 'taza' },
  { es: 'Pan blanco tajado', q: ['bread', 'white', 'commercially prepared'], no: ['toasted', 'reduced', 'low sodium'], cat: 'Baked Products', porc: 'slice', label: 'tajada' },
  { es: 'Tortilla de maíz', q: ['tortillas', 'corn'], cat: 'Baked Products', porc: 'tortilla', label: 'tortilla' },
  { es: 'Galleta de soda', q: ['crackers', 'saltines'], no: ['fat free', 'fat-free', 'low salt', 'low-sodium'], cat: 'Baked Products', porc: 'crackers', porcNo: ['crushed', 'square'], label: 'porción (5 galletas)' },
  { es: 'Harina de maíz precocida', q: ['corn flour', 'masa'], cat: 'Cereal Grains and Pasta', porc: 'cup', label: 'taza' },
  { es: 'Harina de trigo', q: ['wheat flour', 'white', 'all-purpose'], no: ['self-rising', 'bleached, calcium'], cat: 'Cereal Grains and Pasta', porc: 'cup', label: 'taza' },
  { es: 'Batata o camote cocido', q: ['sweet potato', 'cooked', 'boiled', 'without skin'], cat: 'Vegetables and Vegetable Products', porc: 'medium', label: 'unidad' },
  { es: 'Ñame cocido', q: ['yam', 'cooked', 'boiled'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Patacón (plátano verde frito)', q: ['plantains', 'green', 'fried'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'porción' },
  { es: 'Papa frita', fdc: '170452', q: ['potatoes'], porc: 'strip', label: 'porción (10 papas)' },
  { es: 'Granola', q: ['granola', 'homemade'], cat: 'Breakfast Cereals', porc: 'cup', label: 'porción' },
  { es: 'Palomitas de maíz', q: ['snacks', 'popcorn', 'air-popped'], cat: 'Snacks', porc: 'cup', label: 'taza' },
  // ── GRASAS ─────────────────────────────────────────────────────────────────
  { es: 'Aceite de girasol', q: ['oil', 'sunflower'], no: ['high oleic', 'industrial'], cat: 'Fats and Oils', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Aceite de coco', q: ['oil', 'coconut'], cat: 'Fats and Oils', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Margarina', q: ['margarine', 'regular', 'stick'], cat: 'Fats and Oils', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Mayonesa', q: ['mayonnaise', 'regular'], no: ['low', 'light', 'imitation'], cat: 'Fats and Oils', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Nueces', q: ['nuts', 'walnuts', 'english'], cat: 'Nut and Seed Products', porc: 'oz', label: 'puñado' },
  { es: 'Marañón o anacardo', q: ['nuts', 'cashew', 'raw'], cat: 'Nut and Seed Products', porc: 'oz', label: 'puñado' },
  { es: 'Semillas de girasol', q: ['seeds', 'sunflower', 'kernels', 'dried'], cat: 'Nut and Seed Products', porc: 'cup', porcNo: ['hulls'], label: 'taza' },
  { es: 'Chía', q: ['seeds', 'chia', 'dried'], cat: 'Nut and Seed Products', porc: 'oz', label: 'cucharada' },
  { es: 'Linaza', q: ['seeds', 'flaxseed'], cat: 'Nut and Seed Products', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Ajonjolí', q: ['seeds', 'sesame', 'whole', 'dried'], cat: 'Nut and Seed Products', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Coco', q: ['nuts', 'coconut meat', 'raw'], cat: 'Nut and Seed Products', porc: 'cup', label: 'taza' },
  // ── VERDURAS ───────────────────────────────────────────────────────────────
  { es: 'Pimentón rojo', q: ['peppers', 'sweet', 'red', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Calabacín', q: ['squash', 'zucchini', 'raw'], no: ['baby'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Coliflor', q: ['cauliflower', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Repollo', q: ['cabbage', 'raw'], no: ['red', 'savoy', 'chinese', 'napa'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Apio', q: ['celery', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Remolacha', q: ['beets', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Berenjena', q: ['eggplant', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Champiñones', q: ['mushrooms', 'white', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Acelga', q: ['chard', 'swiss', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'taza' },
  { es: 'Ajo', q: ['garlic', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'clove', label: 'diente' },
  { es: 'Cilantro', q: ['coriander', 'leaves', 'raw'], cat: 'Vegetables and Vegetable Products', porc: 'cup', label: 'manojo' },
  { es: 'Arveja seca cocida', q: ['peas', 'split', 'mature', 'cooked'], cat: 'Legumes and Legume Products', porc: 'cup', label: 'taza' },
  // ── FRUTAS ─────────────────────────────────────────────────────────────────
  { es: 'Manzana', q: ['apples', 'raw', 'with skin'], no: ['crab', 'rose'], cat: 'Fruits and Fruit Juices', porc: 'medium', label: 'manzana' },
  { es: 'Pera', q: ['pears', 'raw'], no: ['asian', 'canned', 'dried'], cat: 'Fruits and Fruit Juices', porc: 'medium', label: 'pera' },
  { es: 'Uvas', q: ['grapes', 'red or green', 'raw'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'taza' },
  { es: 'Sandía', q: ['watermelon', 'raw'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'taza' },
  { es: 'Melón', q: ['melons', 'cantaloupe', 'raw'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'taza' },
  { es: 'Mora', q: ['blackberries', 'raw'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'taza' },
  { es: 'Durazno', q: ['peaches', 'raw'], no: ['canned', 'dried', 'frozen'], cat: 'Fruits and Fruit Juices', porc: 'medium', label: 'durazno' },
  { es: 'Ciruela', q: ['plums', 'raw'], cat: 'Fruits and Fruit Juices', porc: 'fruit', label: 'ciruela' },
  { es: 'Limón', q: ['lemons', 'raw', 'without peel'], cat: 'Fruits and Fruit Juices', porc: 'fruit', label: 'limón' },
  { es: 'Kiwi', q: ['kiwifruit', 'green', 'raw'], cat: 'Fruits and Fruit Juices', porc: 'fruit', label: 'kiwi' },
  { es: 'Arándanos', q: ['blueberries', 'raw'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'taza' },
  { es: 'Ciruela pasa', q: ['plums', 'dried', 'prunes', 'uncooked'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'taza' },
  { es: 'Pasas', q: ['raisins', 'seedless'], no: ['golden'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'taza' },
  { es: 'Jugo de naranja natural', q: ['orange juice', 'raw'], cat: 'Fruits and Fruit Juices', porc: 'cup', label: 'vaso' },
  // ── AZÚCARES Y OTROS ───────────────────────────────────────────────────────
  { es: 'Azúcar', q: ['sugars', 'granulated'], cat: 'Sweets', porc: 'teaspoon', label: 'cucharadita' },
  { es: 'Miel', q: ['honey'], cat: 'Sweets', porc: 'tablespoon', label: 'cucharada' },
  { es: 'Panela o azúcar morena', q: ['sugars', 'brown'], cat: 'Sweets', porc: 'teaspoon', label: 'cucharadita' },
  { es: 'Chocolatina de leche', q: ['candies', 'milk chocolate'], no: ['coated', 'with'], cat: 'Sweets', porc: 'oz', label: 'porción' },
  { es: 'Helado de vainilla', q: ['ice creams', 'vanilla'], no: ['light', 'rich', 'soft'], cat: 'Sweets', porc: 'cup', label: 'porción' },
  { es: 'Gaseosa', fdc: '174852', q: ['cola'], porc: 'can or bottle (12', label: 'lata' },
  { es: 'Café negro', q: ['beverages', 'coffee', 'brewed', 'prepared with tap water'], no: ['decaffeinated', 'espresso'], cat: 'Beverages', porc: 'cup', label: 'pocillo' },
  { es: 'Proteína en polvo (whey)', q: ['whey', 'protein powder'], porc: 'cup', label: 'medida' },
  // ── FUERA A PROPOSITO ──────────────────────────────────────────────────────
  // CERVEZA y demas bebidas alcoholicas: sus calorias vienen del ETANOL (7 kcal/g), que no es
  // proteina, carbohidrato ni grasa. Nuestro modelo (kcal + P/C/F) no puede representarlas: el
  // validador midio 43 kcal declaradas contra 16 que dan sus macros (63% de desfase) y las
  // rechazo solo. Meterlas haria que quien toma cerveza registre MENOS de lo que come sin que
  // nada avise. Queda anotado en el plan como limitacion conocida del modelo.
  // CHOCOLATE DE MESA: el registro «Baking chocolate, unsweetened, liquid» se desvia 32% (fibra
  // + variante liquida). No se fuerza: entra cuando llegue la TCAC, que tiene el nuestro.
];

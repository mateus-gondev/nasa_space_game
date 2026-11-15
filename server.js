const express = require("express");
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three/build')));

const disableCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  });
  next();
};

app.get('/game', disableCache, (req, res) => {
  res.redirect(302, '/');
});

app.use('/assets', disableCache, express.static(path.join(__dirname, 'static/assets')));
app.use('/main-menu', disableCache, express.static(path.join(__dirname, 'static/main_menu')));
app.use('/lab-training', disableCache, express.static(path.join(__dirname, 'static/lab_training')));
app.use('/map-engine-v2', disableCache, express.static(path.join(__dirname, 'static/opportunity-map-engine-v2/opportunity-map-engine')));

app.use(disableCache, express.static(path.join(__dirname, 'static/main_menu')));
app.use(disableCache, express.static(path.join(__dirname, 'static/opportunity-game')));

app.listen(port, "0.0.0.0", () => {
  console.log(`API disponível na porta ${port}`);
});

/**
 * GET /
 * Home page.
 */
exports.index = function index(req, res) {
  res.render('features', {
    title: 'Features',
  });
};

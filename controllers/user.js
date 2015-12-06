/**
 * GET /logout
 * Log out.
 */
exports.logout = function logout(req, res) {
  req.logout();
  res.redirect('/');
};

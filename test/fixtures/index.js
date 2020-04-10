/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.helloWorld = (req, res) => {
  const message = req.query.message || req.body.message || '👋🌏';
  res.status(200).send(message);
};

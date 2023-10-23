/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
export function helloWorld(request, response) {
	const message = request.query.message || request.body.message || '👋🌏';
	response.status(200).send(message);
}

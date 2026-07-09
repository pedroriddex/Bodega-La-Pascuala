export class RequestError extends Error {
	readonly status: number;
	readonly code: string;
	readonly headers?: Record<string, string>;

	constructor(status: number, code: string, message: string, headers?: Record<string, string>) {
		super(message);
		this.name = 'RequestError';
		this.status = status;
		this.code = code;
		this.headers = headers;
	}
}

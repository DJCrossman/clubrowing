type DomainErrorCode =
	| "BAD_REQUEST"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "PRECONDITION_FAILED"
	| "BAD_GATEWAY";

export class DomainError extends Error {
	readonly code: DomainErrorCode;

	constructor(code: DomainErrorCode, message: string) {
		super(message);
		this.name = "DomainError";
		this.code = code;
	}
}

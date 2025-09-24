import { AuthService } from './auth.service';

describe('AuthService', () => {
	let authService: AuthService;

	beforeEach(() => {
		authService = new AuthService();
	});

	test('register method should be defined', () => {
		expect(authService.register).toBeDefined();
	});

	test('login method should be defined', () => {
		expect(authService.login).toBeDefined();
	});

	test('verifyMfa method should be defined', () => {
		expect(authService.verifyMfa).toBeDefined();
	});

	test('forgotPassword method should be defined', () => {
		expect(authService.forgotPassword).toBeDefined();
	});

	test('resetPassword method should be defined', () => {
		expect(authService.resetPassword).toBeDefined();
	});

	test('refreshToken method should be defined', () => {
		expect(authService.refreshToken).toBeDefined();
	});
});
const { AuthService } = require('../services/auth.service');

describe('AuthService', () => {
	test('register method', () => {
		const authService = new AuthService();
		expect(authService.register).toBeDefined();
	});

	test('login method', () => {
		const authService = new AuthService();
		expect(authService.login).toBeDefined();
	});

	test('verifyMfa method', () => {
		const authService = new AuthService();
		expect(authService.verifyMfa).toBeDefined();
	});

	test('forgotPassword method', () => {
		const authService = new AuthService();
		expect(authService.forgotPassword).toBeDefined();
	});

	test('resetPassword method', () => {
		const authService = new AuthService();
		expect(authService.resetPassword).toBeDefined();
	});

	test('refreshToken method', () => {
		const authService = new AuthService();
		expect(authService.refreshToken).toBeDefined();
	});
});
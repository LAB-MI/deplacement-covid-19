module.exports = {
	root: true,
	env: {
    node: true,
    browser: true,
	},
	extends: ["standard"],
	rules: {
		"no-console": process.env.NODE_ENV === "production" ? "error" : "off",
		"no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
		"comma-dangle": [2, "always-multiline"],
		"no-var": 2,
	},
	overrides: [
		{
			files: ["**/__tests__/*.js", "**/tests/unit/**/*.spec.js"],
			env: {
				jest: true
			}
		}
	],
	parserOptions: {
		parser: "babel-eslint"
	},
	overrides: [
		{
			files: ["**/__tests__/*.js", "**/tests/unit/**/*.spec.js"],
			env: {
				jest: true
			}
		}
	]
};

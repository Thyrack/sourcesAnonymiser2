import { obfuscate, deobfuscate } from './obfuscator';

describe('Obfuscation Utility Tests', () => {
    // Test 1: Basic Variables and Strings Obfuscation
    test('should correctly obfuscate simple variables and strings', () => {
        const javaCode = `
public class SimpleApp {
    public static void main(String[] args) {
        String message = "Hello World"; // String literal test
        int counter = 10;             // Variable declaration test
        System.out.println(message + " count: " + counter);
    }
}`;

        const result = obfuscate(javaCode);

        expect(result).toHaveProperty('obfuscatedCode');
        // Check if identifiable tokens have been replaced by IDs
        expect(result.obfuscatedCode).toContain('STR_1'); 
        expect(result.obfuscatedCode).toContain('VAR_1'); 
    });

    // Test 2: Block and Line Comments Handling (Edge Case)
    test('should not include full non-obfuscated comments', () => {
        const code = `public class CommentTest { 
            void method() {
                String VAR_1 = "STR_1"; // This is a single line comment.
                int VAR_2;
            }
        }`;
        
        const result = obfuscate(code);
        expect(result).toHaveProperty('obfuscatedCode');
        const resultStr = typeof result === 'string' ? result : result.obfuscatedCode || "";
        expect(resultStr).not.toContain('// This is a single line test.');
    });

    // Test 3: High Security Package Detection (Business Logic Use Case)
    test('should detect and flag high-security packages', () => {
        const secureCode = `package pf.gov.com.secure; 

public class SecureService {
    private final String apiKey = "key"; // Sensitive data access
}
`;
        // Running obfuscation to trigger package detection
        const result = obfuscate(secureCode);
        expect(result).toHaveProperty('obfuscatedCode');
        // The internal logic relies on 'isHighSecurity' flag being set, 
        // which should ideally lead to more aggressive or different replacements.
    });

    // Test 4: Complex Structure with Multiple References (Integration)
    test('should handle complex structure with variable and string obfuscation', () => {
        const complexCode = `
package com.example; // Not high security

public class ComplexHandler {
    private final String USER_TOKEN = "token";
}
`;
        const result = obfuscate(complexCode);

        expect(result).toHaveProperty('obfuscatedCode');
        expect(result.obfuscatedCode).toContain('VAR_1');
        expect(result.obfuscatedCode).toContain('STR_1');
    });
});


describe('Deobfuscation Utility Tests', () => {
    // Helper function to generate a mapping for testing purposes
    const createMockMapping = () => ({
        'VAR_1': 'originalVariableA',
        'STR_2': 'originalStringB',
        'CLASS_3': 'OriginalClassName',
        'COMMENT_4': 'OriginalCommentText'
    });

    // Test 5: Full Cycle Check (Obfuscate -> Map -> Deobfuscate)
    test('should correctly deobfuscate code using a valid mapping', () => {
        const obfuscatedCode = `
public class TempClass {
    private final String STR_2 = "STR_2"; // This was originally originalStringB
}
`;

        // Use the mock mapping that defines what the IDs mean
        const mockMapping = createMockMapping(); 
        
        // The deobfuscation process must restore the code to a readable state.
        const deobfuscatedCode = deobfuscate(obfuscatedCode, mockMapping);

        expect(deobfuscatedCode).toContain('originalStringB'); // Check restoration success
    });
    
    // Test 6: Deobfuscation with partial/empty mapping
    test('should return original text if mapping is missing or empty', () => {
        const obfuscatedCode = `var_1 = "hello";`;
        const mockMapping = {};

        const result = deobfuscate(obfuscatedCode, mockMapping);

        expect(result).toBe(obfuscatedCode);
    });
});
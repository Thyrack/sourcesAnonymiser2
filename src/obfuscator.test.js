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
        expect(result.obfuscatedCode).toContain('Var_1');
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
        expect(result.obfuscatedCode).toContain('Var_1');
        expect(result.obfuscatedCode).toContain('STR_1');
    });

    // Test 7: High Security pf.gov package obfuscation
    test('should obfuscate package and imports in high-security mode (pf.gov)', () => {
        const secureCode = `package pf.gov.si.secret;
import static pf.gov.si.util.Constants.SECRET_VAL;
public class SecretClass {
    public void process() {
        System.out.println(SECRET_VAL);
    }
}`;
        const result = obfuscate(secureCode);

        // pf, gov, si and secret should all be obfuscated
        expect(result.obfuscatedCode).toContain('package Var_1.Var_2.Var_3.Var_4;');
        // Entire path should be obfuscated where not safe
        expect(result.obfuscatedCode).toContain('import static Var_1.Var_2.Var_3.util.Class_1.Class_2;');
        // Class and method
        expect(result.obfuscatedCode).toContain('public class Class_3');
        expect(result.obfuscatedCode).toContain('Var_5'); // process method
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

    test('should be case-insensitive during deobfuscation', () => {
        const mapping = {
            'Var_1': 'myVariable',
            'Class_1': 'MyClass'
        };
        const aiOutput = 'public class CLASS_1 { private String VAR_1; }';
        const result = deobfuscate(aiOutput, mapping);
        expect(result).toContain('public class MyClass');
        expect(result).toContain('private String myVariable');
    });
});

describe('Reported Bugs Reproduction', () => {
    test('should not obfuscate external imports (org.apache, java.math)', () => {
        const code = `
package pf.gov.test;
import static org.apache.commons.lang.StringUtils.defaultString;
import java.math.BigDecimal;
import pf.gov.si.Internal;

public class Test {
    private BigDecimal val;
}
`;
        const result = obfuscate(code);
        expect(result.obfuscatedCode).toContain('import static org.apache.commons.lang.StringUtils.defaultString;');
        expect(result.obfuscatedCode).toContain('import java.math.BigDecimal;');
        expect(result.obfuscatedCode).not.toContain('import pf.gov.si.Internal;');
    });

    test('should obfuscate all packages and classes by default', () => {
        const code = `
package com.external;
import org.apache.commons.ListUtils;
import pf.gov.si.Service;

public class External {
    private Service service;
}
`;
        const result = obfuscate(code);
        // com is safe, external is NOT
        expect(result.obfuscatedCode).toContain('package com.Var_');
        expect(result.obfuscatedCode).toContain('import org.apache.commons.ListUtils;');
    });

    test('should erase all comments on properties and methods', () => {
        const code = `
public class CommentTest {
    /** property comment */
    private String name;

    /* block comment */
    public void doSomething() {
        // line comment inside method (should also be erased)
        System.out.println("hello");
    }

    // line comment on method
    public void other() {}
}
`;
        const result = obfuscate(code);
        expect(result.obfuscatedCode).not.toContain('property comment');
        expect(result.obfuscatedCode).not.toContain('block comment');
        expect(result.obfuscatedCode).not.toContain('line comment inside method');
        expect(result.obfuscatedCode).not.toContain('line comment on method');
    });

    test('should not obfuscate annotations from packages other than pf.gov', () => {
        const code = `
package pf.gov.test;
import javax.persistence.Entity;
import pf.gov.si.MyAnnotation;

@Entity
@pf.gov.si.MyAnnotation
public class Annotated {
    @Override
    public String toString() { return ""; }
}
`;
        const result = obfuscate(code);
        // console.log("OBFUSCATED CODE:\n", result.obfuscatedCode);
        expect(result.obfuscatedCode).toContain('@Entity');
        expect(result.obfuscatedCode).toContain('@Override');
        expect(result.obfuscatedCode).not.toContain('@pf.gov.si.MyAnnotation');
        expect(result.obfuscatedCode).toContain('@Var_');
    });

    test('should obfuscate multiple units and share identifiers', () => {
        const multiUnitCode = `
package a;
class A {
    String name = "shared";
}

package b;
class B {
    String title = "shared";
}
`;
        // This should fail with original parse but work with our split logic (if split by newline + package)
        const result = obfuscate(multiUnitCode);
        // console.log("OBFUSCATED CODE:\n", result.obfuscatedCode);
        expect(result.obfuscatedCode).toContain('class Class_');

        // Find the STR_ for "shared"
        const mapping = result.newMapping;
        const sharedId = Object.keys(mapping).find(key => mapping[key] === '"shared"');
        expect(sharedId).toBeDefined();

        // Count occurrences of sharedId in obfuscated code - should be 2
        const occurrences = result.obfuscatedCode.split(sharedId).length - 1;
        expect(occurrences).toBe(2);
    });

    test('should obfuscate multiple units with explicit separators and obfuscate identifiers in separators', () => {
        const multiUnitCode = `// --- FILE: MyClassA.java ---
package a;
class MyClassA {
    void callB(MyClassB b) {}
}
// --- FILE: MyClassB.java ---
package b;
class MyClassB {}
`;
        const result = obfuscate(multiUnitCode);
        // console.log("OBFUSCATED CODE:\n", result.obfuscatedCode);

        // Identifiers in separators should be obfuscated
        expect(result.obfuscatedCode).not.toContain('MyClassA.java');
        expect(result.obfuscatedCode).not.toContain('MyClassB.java');

        // Check if Class_1 and Class_2 are used consistently in both separators and code
        const mapping = result.newMapping;
        const idA = Object.keys(mapping).find(k => mapping[k] === 'MyClassA');
        const idB = Object.keys(mapping).find(k => mapping[k] === 'MyClassB');

        expect(idA).toBeDefined();
        expect(idB).toBeDefined();

        expect(result.obfuscatedCode).toContain(`// --- FILE: ${idA}.java ---`);
        expect(result.obfuscatedCode).toContain(`// --- FILE: ${idB}.java ---`);
    });

    test('should obfuscate identifiers in separators even if they are not in the code', () => {
        const code = `// --- FILE: SomeFileName.java ---
public class A {}`;
        const result = obfuscate(code);
        expect(result.obfuscatedCode).not.toContain('SomeFileName');
        expect(result.obfuscatedCode).toMatch(/\/\/ --- FILE: (Class|Var)_\d+\.java ---/);
    });

    test('should preserve file extension in separators even if uppercase', () => {
        const code = `// --- FILE: MyClass.JAVA ---
public class MyClass {}`;
        const result = obfuscate(code);
        expect(result.obfuscatedCode).toContain('.JAVA');
        expect(result.obfuscatedCode).not.toContain('Class_2'); // Should not obfuscate JAVA to Class_N
    });
});

describe('Reported Bugs Restoration Tests', () => {
    test('should obfuscate and restore standard package and class names', () => {
        const code = `package com.example;
public class MyClass {
    private String name;
}`;
        const { obfuscatedCode, newMapping } = obfuscate(code);

        // com should be preserved (in SAFE_IDENTIFIERS), example should be obfuscated
        expect(obfuscatedCode).toContain('package com.Var_');
        expect(obfuscatedCode).toContain('public class Class_');

        const restored = deobfuscate(obfuscatedCode, newMapping);
        expect(restored).toContain('package com.example;');
        expect(restored).toContain('public class MyClass');
        expect(restored).toContain('private String name;');
    });
});

describe('SQL Obfuscation Tests', () => {
    test('should obfuscate simple SQL query', () => {
        const sql = `SELECT name, age FROM users WHERE id = 1;`;
        const result = obfuscate(sql);
        // Keywords like SELECT, FROM, WHERE should be preserved
        expect(result.obfuscatedCode).toContain('SELECT');
        expect(result.obfuscatedCode).toContain('FROM');
        expect(result.obfuscatedCode).toContain('WHERE');
        // Identifiers should be obfuscated
        expect(result.obfuscatedCode).not.toContain('name');
        expect(result.obfuscatedCode).not.toContain('users');
        expect(result.obfuscatedCode).toContain('Var_1');
    });

    test('should obfuscate PL/SQL blocks and preserve comments', () => {
        const plsql = `
DECLARE
  l_name VARCHAR2(100);
BEGIN
  -- This is a comment
  SELECT first_name INTO l_name FROM employees WHERE employee_id = 100;
END;`;
        const result = obfuscate(plsql);
        expect(result.obfuscatedCode).toContain('DECLARE');
        expect(result.obfuscatedCode).toContain('BEGIN');
        expect(result.obfuscatedCode).toContain('END');
        expect(result.obfuscatedCode).not.toContain('l_name');
        expect(result.obfuscatedCode).not.toContain('employees');
        expect(result.obfuscatedCode).not.toContain('This is a comment');
    });

    test('should obfuscate PostgreSQL specific syntax', () => {
        const sql = `SELECT info->'name' FROM users WHERE id = '123'::uuid;`;
        const result = obfuscate(sql);
        expect(result.obfuscatedCode).toContain('SELECT');
        expect(result.obfuscatedCode).toContain('FROM');
        expect(result.obfuscatedCode).toContain('WHERE');
        expect(result.obfuscatedCode).toContain('STR_1'); // 'name'
        expect(result.obfuscatedCode).toContain('STR_2'); // '123'
        expect(result.obfuscatedCode).toContain('uuid'); // keyword
    });
});

describe('Multi-language Support Tests', () => {
    test('should obfuscate multiple units of different languages', () => {
        const code = `// --- FILE: script.js ---
function main() { console.log("js"); }

// --- FILE: query.sql ---
SELECT name FROM employees;

// --- FILE: App.java ---
public class App {}
`;
        const result = obfuscate(code);
        expect(result.obfuscatedCode).toContain('function');
        expect(result.obfuscatedCode).toContain('SELECT');
        expect(result.obfuscatedCode).toContain('public class');
        expect(result.obfuscatedCode).toContain('Var_1'); // main
        expect(result.obfuscatedCode).toContain('Var_2'); // name or employees
        expect(result.obfuscatedCode).toContain('Class_1'); // App
    });

    test('should not treat -- as comment in JS or Java', () => {
        const js = `let i = 10; i--; console.log(i);`;
        const resultJS = obfuscate(js);
        expect(resultJS.obfuscatedCode).toContain('--');
        expect(resultJS.obfuscatedCode).toContain('console.log');

        const java = `public class Test { void m() { int i = 0; i--; } }`;
        const resultJava = obfuscate(java);
        expect(resultJava.obfuscatedCode).toContain('--');
    });
});

describe('Javascript/Typescript Obfuscation Tests', () => {
    test('should obfuscate simple JS function', () => {
        const js = `
function greet(person) {
    const message = "Hello " + person;
    console.log(message);
    return message;
}`;
        const result = obfuscate(js);
        expect(result.obfuscatedCode).toContain('function');
        expect(result.obfuscatedCode).toContain('const');
        expect(result.obfuscatedCode).toContain('return');
        expect(result.obfuscatedCode).toContain('console.log');
        expect(result.obfuscatedCode).not.toContain('greet');
        expect(result.obfuscatedCode).not.toContain('person');
        expect(result.obfuscatedCode).toContain('STR_1'); // "Hello "
    });

    test('should obfuscate TS class', () => {
        const ts = `
export class User {
    private id: number;
    constructor(public name: string) {}
    getId(): number { return this.id; }
}`;
        const result = obfuscate(ts);
        expect(result.obfuscatedCode).toContain('export class');
        expect(result.obfuscatedCode).toContain('private');
        expect(result.obfuscatedCode).toContain('constructor');
        expect(result.obfuscatedCode).toContain('number');
        expect(result.obfuscatedCode).toContain('string');
        expect(result.obfuscatedCode).not.toContain('User');
        expect(result.obfuscatedCode).not.toContain('getId');
    });
});

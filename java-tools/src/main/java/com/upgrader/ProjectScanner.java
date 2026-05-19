package com.upgrader;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.ImportDeclaration;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

public class ProjectScanner {

    static final List<String> DEPRECATED_APIS = Arrays.asList(
        "JobBuilderFactory",
        "StepBuilderFactory",
        "WebSecurityConfigurerAdapter",
        "EnableWebSecurity"
    );

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: scanner <project-path>");
            System.exit(1);
        }

        String projectPath = args[0];
        List<String> javaxImports = new ArrayList<>();
        List<String> deprecatedApis = new ArrayList<>();
        List<String> javaFiles = new ArrayList<>();
        String springBootVersion = "unknown";

        // Walk all .java files
        Files.walk(Paths.get(projectPath))
            .filter(p -> p.toString().endsWith(".java"))
            .forEach(path -> {
                javaFiles.add(path.toString());
                try {
                    CompilationUnit cu = StaticJavaParser.parse(path);
                    for (ImportDeclaration imp : cu.getImports()) {
                        String name = imp.getNameAsString();
                        if (name.startsWith("javax.")) {
                            if (!javaxImports.contains(name)) {
                                javaxImports.add(name);
                            }
                        }
                        for (String api : DEPRECATED_APIS) {
                            String entry = api + " in " + path.getFileName();
                            if (name.contains(api) && !deprecatedApis.contains(entry)) {
                                deprecatedApis.add(entry);
                            }
                        }
                    }
                } catch (Exception e) {
                    // Skip unparseable files
                }
            });

        // Read build.gradle for Spring Boot version
        Path gradlePath = Paths.get(projectPath, "build.gradle");
        if (Files.exists(gradlePath)) {
            String content = new String(Files.readAllBytes(gradlePath));
            Matcher m = Pattern.compile(
                "org\\.springframework\\.boot['\"].*?version\\s+['\"]([^'\"]+)['\"]"
            ).matcher(content);
            if (m.find()) springBootVersion = m.group(1);
        }

        // Also check build.gradle.kts
        Path gradleKtsPath = Paths.get(projectPath, "build.gradle.kts");
        if (Files.exists(gradleKtsPath) && springBootVersion.equals("unknown")) {
            String content = new String(Files.readAllBytes(gradleKtsPath));
            Matcher m = Pattern.compile(
                "springframework\\.boot.*?version\\s*=\\s*\"([^\"]+)\""
            ).matcher(content);
            if (m.find()) springBootVersion = m.group(1);
        }

        // Print JSON output
        System.out.println("{");
        System.out.println("  \"totalFiles\": " + javaFiles.size() + ",");
        System.out.println("  \"springBootVersion\": \"" + springBootVersion + "\",");
        System.out.println("  \"javaxImports\": " + toJsonArray(javaxImports) + ",");
        System.out.println("  \"deprecatedApis\": " + toJsonArray(deprecatedApis));
        System.out.println("}");
    }

    static String toJsonArray(List<String> items) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) {
            sb.append("\"").append(items.get(i).replace("\\", "\\\\").replace("\"", "\\\"")).append("\"");
            if (i < items.size() - 1) sb.append(", ");
        }
        sb.append("]");
        return sb.toString();
    }
}

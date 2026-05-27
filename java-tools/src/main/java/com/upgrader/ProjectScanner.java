package com.upgrader;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.ImportDeclaration;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;

import java.nio.file.*;
import java.util.*;

public class ProjectScanner {

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            System.err.println("Usage: java -jar scanner.jar <project-path>");
            System.exit(1);
        }

        String projectPath = args[0];
        ScanResult result = scanProject(projectPath);
        System.out.println(result.toJson());
    }

    static ScanResult scanProject(String projectPath) throws Exception {
        ScanResult result = new ScanResult();
        result.projectPath = projectPath;

        Path root = Paths.get(projectPath);

        // Detect build system
        if (Files.exists(root.resolve("build.gradle")) ||
            Files.exists(root.resolve("build.gradle.kts"))) {
            result.buildSystem = "gradle";
            scanBuildGradle(root, result);
        } else if (Files.exists(root.resolve("pom.xml"))) {
            result.buildSystem = "maven";
            scanPomXml(root, result);
        } else {
            result.buildSystem = "unknown";
        }

        // Scan Dockerfile
        scanDockerfile(root, result);

        // Scan Jenkinsfile
        scanJenkinsfile(root, result);

        // Scan all Java files recursively
        Files.walk(root)
            .filter(p -> p.toString().endsWith(".java"))
            .forEach(p -> scanJavaFile(p, result));

        return result;
    }

    // ─── Gradle Scanner ───────────────────────────────────────────────────────

    static void scanBuildGradle(Path root, ScanResult result) {
        Path gradle = root.resolve("build.gradle");
        if (!Files.exists(gradle)) gradle = root.resolve("build.gradle.kts");
        if (!Files.exists(gradle)) return;

        try {
            String content = Files.readString(gradle);
            result.hasBuildFile = true;

            // Detect Spring Boot version
            if (content.contains("springframework.boot")) {
                if (content.contains("'2.7") || content.contains("\"2.7") ||
                    content.contains("'2.6") || content.contains("\"2.6") ||
                    content.contains("'2.5") || content.contains("\"2.5")) {
                    result.springBootVersion = "2.7.x";
                    result.issues.add(new Issue(
                        "build.gradle",
                        "Spring Boot 2.x detected — upgrade required",
                        "Update org.springframework.boot version to 3.2.0",
                        "DEPENDENCY"
                    ));
                } else if (content.contains("'3.") || content.contains("\"3.")) {
                    result.springBootVersion = "3.x";
                }
            }

            // Detect Spring Batch
            if (content.contains("spring-boot-starter-batch") ||
                content.contains("spring-batch")) {
                result.hasSpringBatch = true;
                result.springBatchVersion = "4.x";
            }

        } catch (Exception e) {
            result.errors.add("Failed to read build.gradle: " + e.getMessage());
        }
    }

    // ─── Maven Scanner ────────────────────────────────────────────────────────

    static void scanPomXml(Path root, ScanResult result) {
        Path pom = root.resolve("pom.xml");
        if (!Files.exists(pom)) return;

        try {
            String content = Files.readString(pom);
            result.hasBuildFile = true;

            // Detect Spring Boot version from parent or dependency
            if (content.contains("spring-boot")) {
                if (content.contains("<version>2.7") ||
                    content.contains("<version>2.6") ||
                    content.contains("<version>2.5")) {
                    result.springBootVersion = "2.7.x";
                    result.issues.add(new Issue(
                        "pom.xml",
                        "Spring Boot 2.x detected — upgrade required",
                        "Update spring-boot-starter-parent version to 3.2.0",
                        "DEPENDENCY"
                    ));
                } else if (content.contains("<version>3.")) {
                    result.springBootVersion = "3.x";
                } else {
                    result.springBootVersion = "2.x (version unresolved)";
                    result.issues.add(new Issue(
                        "pom.xml",
                        "Spring Boot detected — version needs manual check",
                        "Verify and update to Spring Boot 3.2.0",
                        "DEPENDENCY"
                    ));
                }
            }

            // Detect Java version
            if (content.contains("<java.version>17") ||
                content.contains("<java.version>11") ||
                content.contains("<java.version>8")) {
                result.issues.add(new Issue(
                    "pom.xml",
                    "Java version below 21 detected",
                    "Update java.version to 21",
                    "DEPENDENCY"
                ));
            }

            // Detect Spring Batch
            if (content.contains("spring-batch") ||
                content.contains("spring-boot-starter-batch")) {
                result.hasSpringBatch = true;
                result.springBatchVersion = "4.x";
            }

        } catch (Exception e) {
            result.errors.add("Failed to read pom.xml: " + e.getMessage());
        }
    }

    // ─── Dockerfile Scanner ───────────────────────────────────────────────────

    static void scanDockerfile(Path root, ScanResult result) {
        Path dockerfile = root.resolve("Dockerfile");
        if (!Files.exists(dockerfile)) return;

        try {
            String content = Files.readString(dockerfile);
            result.hasDockerfile = true;

            if (content.contains("eclipse-temurin:17") ||
                content.contains("openjdk:17") ||
                content.contains("temurin:17")) {
                result.issues.add(new Issue(
                    "Dockerfile",
                    "Base image uses JDK 17",
                    "Update to eclipse-temurin:21-jdk-alpine",
                    "DOCKERFILE"
                ));
            }

        } catch (Exception e) {
            result.errors.add("Failed to read Dockerfile: " + e.getMessage());
        }
    }

    // ─── Jenkinsfile Scanner ──────────────────────────────────────────────────

    static void scanJenkinsfile(Path root, ScanResult result) {
        Path jenkinsfile = root.resolve("Jenkinsfile");
        if (!Files.exists(jenkinsfile)) return;

        try {
            String content = Files.readString(jenkinsfile);
            result.hasJenkinsfile = true;

            if (content.contains("JDK17") || content.contains("JDK11")) {
                result.issues.add(new Issue(
                    "Jenkinsfile",
                    "Jenkins pipeline uses JDK 17 or below",
                    "Update tools.jdk to JDK21",
                    "JENKINS"
                ));
            }

            if (content.contains("Gradle7") || content.contains("Gradle6")) {
                result.issues.add(new Issue(
                    "Jenkinsfile",
                    "Jenkins pipeline uses old Gradle version",
                    "Update tools.gradle to Gradle9",
                    "JENKINS"
                ));
            }

        } catch (Exception e) {
            result.errors.add("Failed to read Jenkinsfile: " + e.getMessage());
        }
    }

    // ─── Java File Scanner ────────────────────────────────────────────────────

    static void scanJavaFile(Path filePath, ScanResult result) {
        try {
            JavaParser parser = new JavaParser();
            Optional<CompilationUnit> cu = parser.parse(filePath).getResult();
            if (!cu.isPresent()) return;

            String fileName = filePath.getFileName().toString();
            result.totalJavaFiles++;

            // Check imports
            for (ImportDeclaration imp : cu.get().getImports()) {
                String importName = imp.getNameAsString();

                if (importName.startsWith("javax.persistence")) {
                    result.issues.add(new Issue(
                        fileName,
                        "javax.persistence import: " + importName,
                        "Replace with jakarta.persistence.*",
                        "JAVAX"
                    ));
                }
                if (importName.startsWith("javax.servlet")) {
                    result.issues.add(new Issue(
                        fileName,
                        "javax.servlet import: " + importName,
                        "Replace with jakarta.servlet.*",
                        "JAVAX"
                    ));
                }
                if (importName.startsWith("javax.validation")) {
                    result.issues.add(new Issue(
                        fileName,
                        "javax.validation import: " + importName,
                        "Replace with jakarta.validation.*",
                        "JAVAX"
                    ));
                }
                if (importName.startsWith("javax.annotation")) {
                    result.issues.add(new Issue(
                        fileName,
                        "javax.annotation import: " + importName,
                        "Replace with jakarta.annotation.*",
                        "JAVAX"
                    ));
                }
                if (importName.startsWith("javax.transaction")) {
                    result.issues.add(new Issue(
                        fileName,
                        "javax.transaction import: " + importName,
                        "Replace with jakarta.transaction.*",
                        "JAVAX"
                    ));
                }
                if (importName.contains("JobBuilderFactory")) {
                    result.issues.add(new Issue(
                        fileName,
                        "JobBuilderFactory is deprecated in Spring Batch 5",
                        "Use JobBuilder instead",
                        "DEPRECATED_API"
                    ));
                }
                if (importName.contains("StepBuilderFactory")) {
                    result.issues.add(new Issue(
                        fileName,
                        "StepBuilderFactory is deprecated in Spring Batch 5",
                        "Use StepBuilder instead",
                        "DEPRECATED_API"
                    ));
                }
            }

            // Check class declarations for removed classes
            cu.get().findAll(ClassOrInterfaceDeclaration.class).forEach(cls -> {
                cls.getExtendedTypes().forEach(ext -> {
                    if (ext.getNameAsString().equals("WebSecurityConfigurerAdapter")) {
                        result.issues.add(new Issue(
                            fileName,
                            "WebSecurityConfigurerAdapter is removed in Spring 6",
                            "Use SecurityFilterChain bean instead",
                            "DEPRECATED_API"
                        ));
                    }
                });
            });

        } catch (Exception e) {
            result.errors.add("Failed to scan " +
                filePath.getFileName() + ": " + e.getMessage());
        }
    }

    // ─── Data Classes ─────────────────────────────────────────────────────────

    static class Issue {
        String file;
        String description;
        String recommendation;
        String type;

        Issue(String file, String description,
              String recommendation, String type) {
            this.file        = file;
            this.description = description;
            this.recommendation = recommendation;
            this.type        = type;
        }

        String toJson() {
            return String.format(
                "{\"file\":\"%s\",\"description\":\"%s\"," +
                "\"recommendation\":\"%s\",\"type\":\"%s\"}",
                escape(file), escape(description),
                escape(recommendation), type
            );
        }
    }

    static class ScanResult {
        String projectPath      = "";
        String buildSystem      = "unknown";
        String springBootVersion = "unknown";
        String springBatchVersion = "none";
        boolean hasBuildFile    = false;
        boolean hasDockerfile   = false;
        boolean hasJenkinsfile  = false;
        boolean hasSpringBatch  = false;
        int totalJavaFiles      = 0;
        List<Issue>  issues     = new ArrayList<>();
        List<String> errors     = new ArrayList<>();

        String toJson() {
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            sb.append("\"projectPath\":\"").append(escape(projectPath)).append("\",");
            sb.append("\"buildSystem\":\"").append(buildSystem).append("\",");
            sb.append("\"springBootVersion\":\"").append(springBootVersion).append("\",");
            sb.append("\"springBatchVersion\":\"").append(springBatchVersion).append("\",");
            sb.append("\"hasBuildFile\":").append(hasBuildFile).append(",");
            sb.append("\"hasDockerfile\":").append(hasDockerfile).append(",");
            sb.append("\"hasJenkinsfile\":").append(hasJenkinsfile).append(",");
            sb.append("\"hasSpringBatch\":").append(hasSpringBatch).append(",");
            sb.append("\"totalJavaFiles\":").append(totalJavaFiles).append(",");
            sb.append("\"totalIssues\":").append(issues.size()).append(",");
            sb.append("\"issues\":[");
            for (int i = 0; i < issues.size(); i++) {
                sb.append(issues.get(i).toJson());
                if (i < issues.size() - 1) sb.append(",");
            }
            sb.append("],");
            sb.append("\"errors\":[");
            for (int i = 0; i < errors.size(); i++) {
                sb.append("\"").append(escape(errors.get(i))).append("\"");
                if (i < errors.size() - 1) sb.append(",");
            }
            sb.append("]");
            sb.append("}");
            return sb.toString();
        }
    }

    static String escape(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
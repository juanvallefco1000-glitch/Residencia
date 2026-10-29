package com.segurixt.api.auth;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public final class PasswordPolicy {
    private PasswordPolicy() {}
    public static boolean valid(String password) {
        if(password==null || password.codePointCount(0,password.length())<14
                || !password.codePoints().anyMatch(Character::isLetter)
                || !password.codePoints().anyMatch(c -> !Character.isLetter(c))
                || password.codePoints().anyMatch(Character::isISOControl)) return false;
        byte[] bytes=password.getBytes(StandardCharsets.UTF_8);
        try { return bytes.length<=72; } finally { Arrays.fill(bytes,(byte)0); }
    }
}

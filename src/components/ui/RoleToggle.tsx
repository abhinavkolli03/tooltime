import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function RoleToggle() {
    const { role, setRole } = useAuthStore();
    const router = useRouter();

    const handleToggle = (newRole: 'borrower' | 'lender') => {
        if (newRole === role) return;
        setRole(newRole);
        if (newRole === 'lender') {
            router.replace('/(lender)/dashboard');
        } else {
            router.replace('/(borrower)/discover');
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => handleToggle('borrower')}
                style={[styles.toggle, role === 'borrower' && styles.activeToggle]}
            >
                <Text style={[styles.text, role === 'borrower' && styles.activeText]}>Borrow</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => handleToggle('lender')}
                style={[styles.toggle, role === 'lender' && styles.activeToggle]}
            >
                <Text style={[styles.text, role === 'lender' && styles.activeText]}>Lend</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#F5F0E8',
        borderRadius: 20,
        padding: 4,
        alignSelf: 'center',
        marginTop: 10,
    },
    toggle: {
        paddingVertical: 6,
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    activeToggle: {
        backgroundColor: COLORS.accent.primary,
        shadowColor: COLORS.accent.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    text: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.text.muted,
    },
    activeText: {
        color: COLORS.surface,
    }
});

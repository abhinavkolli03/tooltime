import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { COLORS } from '@/constants/theme';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Auth listener in root layout will handle navigation based on role
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                Alert.alert('Login Failed', 'No account found with this email or incorrect password.');
            } else if (error.code === 'auth/wrong-password') {
                Alert.alert('Login Failed', 'Incorrect password.');
            } else {
                Alert.alert('Error', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Reset Password', 'Please enter your email address first.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Success', 'Password reset email sent!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1C1410' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={{ paddingHorizontal: 24, paddingTop: 16, flex: 1 }}>

                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.surface} />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center', paddingRight: 32 }}>
                            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.surface }}>ToolTime</Text>
                        </View>
                    </View>

                    <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 32, color: COLORS.surface, marginBottom: 8 }}>
                        Welcome back.
                    </Text>
                    <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.text.muted, marginBottom: 40 }}>
                        Sign in to manage your workshop.
                    </Text>

                    {/* Form */}
                    <View style={{ gap: 20 }}>
                        <View>
                            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.surface, marginBottom: 8 }}>Email</Text>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#2A1F19',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#3D2D24',
                                paddingHorizontal: 16,
                                height: 56
                            }}>
                                <TextInput
                                    style={{ flex: 1, fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.surface }}
                                    placeholder="jack.hammer@workshop.com"
                                    placeholderTextColor="#665045"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                                {email.includes('@') && <Ionicons name="checkmark-circle" size={20} color={COLORS.semantic.success} />}
                            </View>
                        </View>

                        <View>
                            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.surface, marginBottom: 8 }}>Password</Text>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#2A1F19',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#3D2D24',
                                paddingHorizontal: 16,
                                height: 56
                            }}>
                                <TextInput
                                    style={{ flex: 1, fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.surface }}
                                    placeholder="••••••••"
                                    placeholderTextColor="#665045"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#665045" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ alignItems: 'flex-end', marginTop: -8 }}>
                            <TouchableOpacity onPress={handleForgotPassword}>
                                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.accent.primary }}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ marginTop: 40 }}>
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            style={{
                                backgroundColor: COLORS.accent.primary,
                                height: 56,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.surface} />
                            ) : (
                                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.surface }}>Log In</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', marginBottom: 20 }}>
                        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.text.muted }}>
                            New to ToolTime?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.accent.primary }}>Create an account</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

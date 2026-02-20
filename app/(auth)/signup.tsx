import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { COLORS } from '@/constants/theme';
import { UserRole, UserProfile } from '@/types/user.types';
import { useAuthStore } from '@/store/authStore';

export default function SignupScreen() {
    const router = useRouter();
    const { setProfile } = useAuthStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<UserRole | null>(null);

    const handleNext = () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Missing Fields', 'Please fill out all fields.');
            return;
        }
        if (password.length < 8) {
            Alert.alert('Invalid Password', 'Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match.');
            return;
        }
        setStep(2);
    };

    const handleCreateAccount = async () => {
        if (!role) {
            Alert.alert('Select Role', 'Please select how you will use ToolTime.');
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userProfile: UserProfile = {
                uid: user.uid,
                displayName: name,
                email: email,
                phoneNumber: null,
                avatarUrl: null,
                role: role,
                lenderRating: 0,
                borrowerRating: 0,
                totalRentals: 0,
                stripeCustomerId: null,
                stripeAccountId: null,
                pushToken: null,
                createdAt: Timestamp.now(),
                memberSince: `Member since ${new Date().getFullYear()}`,
            };

            await setDoc(doc(db, 'users', user.uid), userProfile);

            setProfile(userProfile);
            // Auth listener root layout will handle navigation once state reflects
        } catch (error: any) {
            console.error(error);
            Alert.alert('Signup Error', error.message);
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1C1410' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: 24, paddingTop: 16, flex: 1 }}>

                        {/* Header / Nav */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                            <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()} style={{ padding: 8, marginLeft: -8, zIndex: 10 }}>
                                <Ionicons name="chevron-back" size={24} color={COLORS.surface} />
                            </TouchableOpacity>
                            <View style={{ flex: 1, alignItems: 'center', marginLeft: -32 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <View style={{ height: 4, width: 16, backgroundColor: COLORS.accent.primary, borderRadius: 2 }} />
                                    <View style={{ height: 4, width: 16, backgroundColor: step === 2 ? COLORS.accent.primary : '#3D2D24', borderRadius: 2 }} />
                                </View>
                            </View>
                        </View>

                        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: COLORS.accent.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                            STEP {step} OF 2
                        </Text>

                        {step === 1 ? (
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 32, color: COLORS.surface, marginBottom: 8 }}>
                                    Create your account
                                </Text>
                                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.text.muted, marginBottom: 40 }}>
                                    Join your neighborhood toolbox.
                                </Text>

                                <View style={{ gap: 20 }}>
                                    <View>
                                        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.surface, marginBottom: 8 }}>Full Name</Text>
                                        <View style={{ backgroundColor: '#2A1F19', borderRadius: 12, borderWidth: 1, borderColor: '#3D2D24', paddingHorizontal: 16, height: 56, justifyContent: 'center' }}>
                                            <TextInput
                                                style={{ fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.surface }}
                                                placeholder="Jack Hammer"
                                                placeholderTextColor="#665045"
                                                value={name}
                                                onChangeText={setName}
                                            />
                                        </View>
                                    </View>

                                    <View>
                                        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.surface, marginBottom: 8 }}>Email</Text>
                                        <View style={{ backgroundColor: '#2A1F19', borderRadius: 12, borderWidth: 1, borderColor: '#3D2D24', paddingHorizontal: 16, height: 56, justifyContent: 'center' }}>
                                            <TextInput
                                                style={{ fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.surface }}
                                                placeholder="jack.hammer@workshop.com"
                                                placeholderTextColor="#665045"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                value={email}
                                                onChangeText={setEmail}
                                            />
                                        </View>
                                    </View>

                                    <View>
                                        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.surface, marginBottom: 8 }}>Password</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A1F19', borderRadius: 12, borderWidth: 1, borderColor: '#3D2D24', paddingHorizontal: 16, height: 56 }}>
                                            <TextInput
                                                style={{ flex: 1, fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.surface }}
                                                placeholder="Min 8 characters"
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

                                    <View>
                                        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.surface, marginBottom: 8 }}>Confirm Password</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A1F19', borderRadius: 12, borderWidth: 1, borderColor: '#3D2D24', paddingHorizontal: 16, height: 56 }}>
                                            <TextInput
                                                style={{ flex: 1, fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.surface }}
                                                placeholder="Type it again"
                                                placeholderTextColor="#665045"
                                                secureTextEntry={!showPassword}
                                                value={confirmPassword}
                                                onChangeText={setConfirmPassword}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={{ marginTop: 40, marginBottom: 40 }}>
                                    <TouchableOpacity
                                        onPress={handleNext}
                                        style={{
                                            backgroundColor: COLORS.surface,
                                            height: 56,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary }}>Next</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 32, color: COLORS.surface, marginBottom: 8 }}>
                                    How will you use ToolTime?
                                </Text>
                                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.text.muted, marginBottom: 40 }}>
                                    Select your primary role. You can change this later in your profile settings.
                                </Text>

                                <View style={{ gap: 16 }}>
                                    {/* Borrower Card */}
                                    <TouchableOpacity
                                        onPress={() => setRole('borrower')}
                                        style={{
                                            borderWidth: 2,
                                            borderColor: role === 'borrower' ? COLORS.accent.primary : '#3D2D24',
                                            backgroundColor: role === 'borrower' ? 'rgba(196, 98, 42, 0.1)' : '#2A1F19',
                                            borderRadius: 16,
                                            padding: 24,
                                            position: 'relative',
                                        }}
                                    >
                                        {role === 'borrower' && (
                                            <View style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accent.primary, alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="checkmark" size={16} color={COLORS.surface} />
                                            </View>
                                        )}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#3D2D24', alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="hammer" size={24} color={COLORS.surface} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 18, color: COLORS.surface, marginBottom: 4 }}>I want to borrow</Text>
                                                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.text.muted }}>Access high-quality tools near me</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Lender Card */}
                                    <TouchableOpacity
                                        onPress={() => setRole('lender')}
                                        style={{
                                            borderWidth: 2,
                                            borderColor: role === 'lender' ? COLORS.accent.primary : '#3D2D24',
                                            backgroundColor: role === 'lender' ? 'rgba(196, 98, 42, 0.1)' : '#2A1F19',
                                            borderRadius: 16,
                                            padding: 24,
                                            position: 'relative',
                                        }}
                                    >
                                        {role === 'lender' && (
                                            <View style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accent.primary, alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="checkmark" size={16} color={COLORS.surface} />
                                            </View>
                                        )}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#3D2D24', alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="build" size={24} color={COLORS.surface} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 18, color: COLORS.surface, marginBottom: 4 }}>I want to lend</Text>
                                                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.text.muted }}>Turn my tools into extra cash</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Both Card */}
                                    <TouchableOpacity
                                        onPress={() => setRole('both')}
                                        style={{
                                            borderWidth: 2,
                                            borderColor: role === 'both' ? COLORS.accent.primary : '#3D2D24',
                                            backgroundColor: role === 'both' ? 'rgba(196, 98, 42, 0.1)' : '#2A1F19',
                                            borderRadius: 16,
                                            padding: 20,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#3D2D24', alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="swap-horizontal" size={20} color={COLORS.surface} />
                                            </View>
                                            <View>
                                                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.surface, marginBottom: 2 }}>I'm here for both</Text>
                                                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: COLORS.text.muted }}>Lend and borrow seamlessly</Text>
                                            </View>
                                        </View>
                                        {role === 'both' ? (
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accent.primary, alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="checkmark" size={16} color={COLORS.surface} />
                                            </View>
                                        ) : (
                                            <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={{ marginTop: 40, marginBottom: 40 }}>
                                    <TouchableOpacity
                                        onPress={handleCreateAccount}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: COLORS.accent.primary,
                                            height: 56,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: loading ? 0.7 : 1,
                                            flexDirection: 'row',
                                            gap: 8,
                                        }}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color={COLORS.surface} />
                                        ) : (
                                            <>
                                                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.surface }}>Create My Account</Text>
                                                <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
                                        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.text.muted }}>
                                            Already have an account?{' '}
                                        </Text>
                                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.accent.primary }}>Log In</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

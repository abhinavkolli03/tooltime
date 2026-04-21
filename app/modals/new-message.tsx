import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/theme';
import { UserProfile } from '@/types/user.types';
import { Tool } from '@/types/tool.types';
import {
    searchUsers,
    getUserTools,
    findOrCreateDirectThread,
} from '@/services/messageService';

type Step = 'contact' | 'role' | 'tool' | 'creating';

export default function NewMessageModal() {
    const router = useRouter();
    const { user } = useAuthStore();
    const params = useLocalSearchParams<{
        preselectedUserId?: string;
        preselectedUserName?: string;
        preselectedRole?: string;
        preselectedToolId?: string;
        preselectedToolName?: string;
    }>();

    const [step, setStep] = useState<Step>('contact');
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [selectedRole, setSelectedRole] = useState<'borrower' | 'lender' | null>(null);
    const [tools, setTools] = useState<Tool[]>([]);
    const [isLoadingTools, setIsLoadingTools] = useState(false);

    useEffect(() => {
        if (params.preselectedUserId && params.preselectedUserName) {
            const preUser: UserProfile = {
                uid: params.preselectedUserId,
                displayName: params.preselectedUserName,
                email: '',
                phoneNumber: null,
                avatarUrl: null,
                role: 'both',
                lenderRating: 0,
                borrowerRating: 0,
                totalRentals: 0,
                stripeCustomerId: null,
                stripeAccountId: null,
                pushToken: null,
                createdAt: null as any,
                memberSince: '',
            };
            setSelectedUser(preUser);

            if (params.preselectedRole === 'borrower' || params.preselectedRole === 'lender') {
                setSelectedRole(params.preselectedRole);

                if (params.preselectedToolId && params.preselectedToolName) {
                    handleCreateThread(preUser, params.preselectedRole, params.preselectedToolId, params.preselectedToolName);
                } else {
                    setStep('tool');
                    loadTools(preUser.uid, params.preselectedRole);
                }
            } else {
                setStep('role');
            }
        } else {
            loadUsers('');
        }
    }, []);

    const loadUsers = useCallback(async (query: string) => {
        setIsSearching(true);
        try {
            const results = await searchUsers(query);
            setUsers(results);
        } catch (e) {
            console.error('Error searching users:', e);
        }
        setIsSearching(false);
    }, []);

    useEffect(() => {
        if (step === 'contact') {
            const timer = setTimeout(() => loadUsers(search), 300);
            return () => clearTimeout(timer);
        }
    }, [search, step]);

    const loadTools = async (userId: string, role: 'borrower' | 'lender') => {
        setIsLoadingTools(true);
        try {
            const ownerId = role === 'borrower' ? userId : user?.uid || '';
            const toolsList = await getUserTools(ownerId);
            setTools(toolsList);
        } catch (e) {
            console.error('Error loading tools:', e);
        }
        setIsLoadingTools(false);
    };

    const handleSelectUser = (u: UserProfile) => {
        setSelectedUser(u);
        setStep('role');
    };

    const handleSelectRole = (role: 'borrower' | 'lender') => {
        setSelectedRole(role);
        setStep('tool');
        if (selectedUser) {
            loadTools(selectedUser.uid, role);
        }
    };

    const handleSelectTool = (tool: Tool) => {
        if (!selectedUser || !selectedRole) return;
        handleCreateThread(selectedUser, selectedRole, tool.id, tool.name);
    };

    const handleCreateThread = async (
        targetUser: UserProfile,
        role: 'borrower' | 'lender',
        toolId: string,
        toolName: string,
    ) => {
        setStep('creating');
        try {
            const { threadId } = await findOrCreateDirectThread({
                otherUserId: targetUser.uid,
                toolId,
                toolName,
                role,
            });

            router.replace({
                pathname: '/modals/chat',
                params: {
                    threadId,
                    otherName: targetUser.displayName,
                    otherAvatar: targetUser.avatarUrl || '',
                    toolName,
                },
            });
        } catch (e: any) {
            console.error('Error creating thread:', e);
            Alert.alert('Error', 'Could not start conversation. Please try again.');
            setStep('tool');
        }
    };

    const handleBack = () => {
        if (step === 'role') {
            if (params.preselectedUserId) { router.back(); return; }
            setStep('contact');
            setSelectedUser(null);
        } else if (step === 'tool') {
            if (params.preselectedRole) {
                setStep('role');
            } else {
                setStep('role');
            }
            setSelectedRole(null);
            setTools([]);
        } else {
            router.back();
        }
    };

    const renderStepIndicator = () => {
        const steps = ['Contact', 'Role', 'Tool'];
        const currentIdx = step === 'contact' ? 0 : step === 'role' ? 1 : 2;

        return (
            <View style={styles.stepIndicator}>
                {steps.map((s, i) => (
                    <React.Fragment key={s}>
                        <View style={[styles.stepDot, i <= currentIdx && styles.stepDotActive]}>
                            {i < currentIdx ? (
                                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                            ) : (
                                <Text style={[styles.stepDotText, i <= currentIdx && styles.stepDotTextActive]}>
                                    {i + 1}
                                </Text>
                            )}
                        </View>
                        {i < steps.length - 1 && (
                            <View style={[styles.stepLine, i < currentIdx && styles.stepLineActive]} />
                        )}
                    </React.Fragment>
                ))}
            </View>
        );
    };

    const renderContactStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Who do you want to message?</Text>
            <Text style={styles.stepSubtitle}>Search for a registered user on ToolTime</Text>

            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color={COLORS.text.muted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or email..."
                    placeholderTextColor={COLORS.text.muted}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={20} color={COLORS.text.muted} />
                    </TouchableOpacity>
                )}
            </View>

            {isSearching ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="small" color={COLORS.accent.primary} />
                </View>
            ) : users.length === 0 ? (
                <View style={styles.emptySearch}>
                    <Ionicons name="people-outline" size={48} color="#EDE4D4" />
                    <Text style={styles.emptySearchText}>
                        {search ? 'No users found' : 'Loading contacts...'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={u => u.uid}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.userCard}
                            onPress={() => handleSelectUser(item)}
                            activeOpacity={0.7}
                        >
                            <Image
                                source={{ uri: item.avatarUrl || 'https://i.pravatar.cc/150' }}
                                style={styles.userAvatar}
                            />
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{item.displayName}</Text>
                                <Text style={styles.userEmail}>{item.email}</Text>
                            </View>
                            <View style={styles.userMeta}>
                                <Ionicons name="star" size={12} color="#FFD700" />
                                <Text style={styles.userRating}>
                                    {Math.max(item.lenderRating, item.borrowerRating).toFixed(1)}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#D4B896" />
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );

    const renderRoleStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's your role?</Text>
            <Text style={styles.stepSubtitle}>
                Choose how you want to interact with {selectedUser?.displayName?.split(' ')[0]}
            </Text>

            <View style={styles.roleCards}>
                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleSelectRole('borrower')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.roleIconWrap, { backgroundColor: '#E0EDFF' }]}>
                        <Ionicons name="hand-left" size={28} color={COLORS.semantic.info} />
                    </View>
                    <Text style={styles.roleCardTitle}>I want to borrow</Text>
                    <Text style={styles.roleCardDesc}>
                        Browse {selectedUser?.displayName?.split(' ')[0]}'s available tools to rent
                    </Text>
                    <View style={[styles.roleChip, { backgroundColor: '#E0EDFF' }]}>
                        <Text style={[styles.roleChipLabel, { color: COLORS.semantic.info }]}>BORROWER</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleSelectRole('lender')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.roleIconWrap, { backgroundColor: '#E8F5E2' }]}>
                        <Ionicons name="construct" size={28} color={COLORS.semantic.success} />
                    </View>
                    <Text style={styles.roleCardTitle}>I want to lend</Text>
                    <Text style={styles.roleCardDesc}>
                        Pick one of your tools to offer to {selectedUser?.displayName?.split(' ')[0]}
                    </Text>
                    <View style={[styles.roleChip, { backgroundColor: '#E8F5E2' }]}>
                        <Text style={[styles.roleChipLabel, { color: COLORS.semantic.success }]}>LENDER</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderToolStep = () => {
        const toolOwnerName = selectedRole === 'borrower'
            ? `${selectedUser?.displayName?.split(' ')[0]}'s`
            : 'Your';
        const emptyMsg = selectedRole === 'borrower'
            ? `${selectedUser?.displayName?.split(' ')[0]} doesn't have any tools listed yet.`
            : "You don't have any tools listed. List a tool first!";

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Pick a tool</Text>
                <Text style={styles.stepSubtitle}>
                    Select from {toolOwnerName.toLowerCase()} listings to start the conversation
                </Text>

                {isLoadingTools ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={COLORS.accent.primary} />
                    </View>
                ) : tools.length === 0 ? (
                    <View style={styles.emptySearch}>
                        <Ionicons name="construct-outline" size={48} color="#EDE4D4" />
                        <Text style={styles.emptySearchText}>{emptyMsg}</Text>
                        {selectedRole === 'lender' && (
                            <TouchableOpacity
                                style={styles.listToolBtn}
                                onPress={() => router.replace('/modals/list-tool')}
                            >
                                <Text style={styles.listToolBtnText}>List a Tool</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={tools}
                        keyExtractor={t => t.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.toolCard}
                                onPress={() => handleSelectTool(item)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={{ uri: item.photoUrls?.[0] || 'https://via.placeholder.com/80' }}
                                    style={styles.toolImage}
                                />
                                <View style={styles.toolInfo}>
                                    <Text style={styles.toolName}>{item.name}</Text>
                                    <Text style={styles.toolCategory}>
                                        {item.category.replace('_', ' ').toUpperCase()}
                                    </Text>
                                    <Text style={styles.toolPrice}>
                                        ${(item.hourlyRate / 100).toFixed(2)}/hr · ${(item.dailyRate / 100).toFixed(2)}/day
                                    </Text>
                                </View>
                                <View style={styles.toolRating}>
                                    <Ionicons name="star" size={12} color="#FFD700" />
                                    <Text style={styles.toolRatingText}>{item.rating.toFixed(1)}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        );
    };

    const renderCreatingStep = () => (
        <View style={[styles.stepContent, styles.centered]}>
            <ActivityIndicator size="large" color={COLORS.accent.primary} />
            <Text style={styles.creatingText}>Starting conversation...</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        {step === 'contact' ? (
                            <Ionicons name="close" size={26} color={COLORS.text.primary} />
                        ) : (
                            <Ionicons name="chevron-back" size={26} color={COLORS.text.primary} />
                        )}
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Message</Text>
                    <View style={{ width: 40 }} />
                </View>

                {step !== 'creating' && renderStepIndicator()}

                {selectedUser && step !== 'contact' && step !== 'creating' && (
                    <View style={styles.selectedUserBanner}>
                        <Image
                            source={{ uri: selectedUser.avatarUrl || 'https://i.pravatar.cc/150' }}
                            style={styles.selectedUserAvatar}
                        />
                        <Text style={styles.selectedUserName}>{selectedUser.displayName}</Text>
                        {selectedRole && (
                            <View style={[
                                styles.roleBadge,
                                { backgroundColor: selectedRole === 'borrower' ? '#E0EDFF' : '#E8F5E2' }
                            ]}>
                                <Text style={[
                                    styles.roleBadgeText,
                                    { color: selectedRole === 'borrower' ? COLORS.semantic.info : COLORS.semantic.success }
                                ]}>
                                    {selectedRole === 'borrower' ? 'Borrowing' : 'Lending'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {step === 'contact' && renderContactStep()}
                {step === 'role' && renderRoleStep()}
                {step === 'tool' && renderToolStep()}
                {step === 'creating' && renderCreatingStep()}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 18,
        color: COLORS.text.primary,
    },

    // --- Step Indicator ---
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 40,
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F5F0E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepDotActive: {
        backgroundColor: COLORS.accent.primary,
    },
    stepDotText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 11,
        color: COLORS.text.muted,
    },
    stepDotTextActive: {
        color: '#FFFFFF',
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#F5F0E8',
        marginHorizontal: 8,
    },
    stepLineActive: {
        backgroundColor: COLORS.accent.primary,
    },

    // --- Selected User Banner ---
    selectedUserBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        padding: 12,
        gap: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F5F0E8',
    },
    selectedUserAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F0E8',
    },
    selectedUserName: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.text.primary,
        flex: 1,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleBadgeText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
        letterSpacing: 0.3,
    },

    // --- Step Content ---
    stepContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    stepTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 24,
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    stepSubtitle: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: COLORS.text.muted,
        marginBottom: 20,
        lineHeight: 20,
    },

    // --- Search ---
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F0E8',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: COLORS.text.primary,
    },

    // --- User List ---
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
        gap: 12,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F5F0E8',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.primary,
    },
    userEmail: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: COLORS.text.muted,
        marginTop: 2,
    },
    userMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    userRating: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 12,
        color: COLORS.text.secondary,
    },

    // --- Role Cards ---
    roleCards: {
        gap: 16,
        marginTop: 8,
    },
    roleCard: {
        backgroundColor: '#FAFAFA',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#F5F0E8',
        alignItems: 'center',
    },
    roleIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    roleCardTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 18,
        color: COLORS.text.primary,
        marginBottom: 6,
    },
    roleCardDesc: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: COLORS.text.muted,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 14,
    },
    roleChip: {
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 8,
    },
    roleChipLabel: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
        letterSpacing: 0.5,
    },

    // --- Tool List ---
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F5F0E8',
        gap: 12,
    },
    toolImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#F5F0E8',
    },
    toolInfo: {
        flex: 1,
    },
    toolName: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
    },
    toolCategory: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 9,
        color: COLORS.accent.primary,
        letterSpacing: 0.5,
        marginTop: 3,
    },
    toolPrice: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: COLORS.text.muted,
        marginTop: 3,
    },
    toolRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    toolRatingText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 11,
        color: COLORS.text.secondary,
    },

    // --- Empty / Loading ---
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptySearch: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptySearchText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: COLORS.text.muted,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
    },
    listToolBtn: {
        backgroundColor: COLORS.accent.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 20,
    },
    listToolBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: '#FFFFFF',
    },
    creatingText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.muted,
        marginTop: 16,
    },
});

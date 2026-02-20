import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Image } from 'expo-image';

import { db, storage } from '@/services/firebase';
import { COLORS } from '@/constants/theme';
import { confirmHandover } from '@/services/cloudFunctions';

const CHECKLIST_ITEMS = [
    "I have inspected the tool's condition",
    "I have received all included accessories",
    "The lender has demonstrated basic operation",
    "I agree to the tool's current safety state"
];

export default function HandoverModal() {
    const { bookingId } = useLocalSearchParams();
    const router = useRouter();

    const [confirmationCode, setConfirmationCode] = useState<string>('');
    const [checklist, setChecklist] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));
    const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBooking = async () => {
            if (!bookingId) return;
            try {
                const docSnap = await getDoc(doc(db, 'bookings', bookingId as string));
                if (docSnap.exists()) {
                    setConfirmationCode(docSnap.data().confirmationCode || '----');
                }
            } catch (error) {
                console.error('Error fetching booking for handover:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBooking();
    }, [bookingId]);

    const toggleCheck = (index: number) => {
        const newChecklist = [...checklist];
        newChecklist[index] = !newChecklist[index];
        setChecklist(newChecklist);
    };

    const pickImage = async (index: number) => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            const newPhotos = [...photos];
            newPhotos[index] = result.assets[0].uri;
            setPhotos(newPhotos);
        }
    };

    const handleConfirm = async () => {
        if (!bookingId) return;
        setIsUploading(true);

        try {
            // 1. Upload photos to Firebase Storage
            const uploadPromises = photos
                .filter(uri => uri !== null)
                .map(async (uri) => {
                    const response = await fetch(uri!);
                    const blob = await response.blob();
                    const filename = `handover_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                    const storageRef = ref(storage, `bookings/${bookingId}/handover/${filename}`);
                    await uploadBytesResumable(storageRef, blob);
                    return getDownloadURL(storageRef);
                });

            const downloadUrls = await Promise.all(uploadPromises);

            // 2. Call Cloud Function
            const result = await confirmHandover({
                bookingId: bookingId as string,
                confirmationCode: confirmationCode,
                // @ts-ignore - Backend might expect these
                conditionPhotos: downloadUrls
            });

            if (!result.success) {
                throw new Error(result.error || 'Handover confirmation failed');
            }

            Alert.alert('Success', 'Handover confirmed! Your rental is now active.');
            router.back(); // Go back to tracking screen
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const isComplete = checklist.every(c => c) && !isUploading;

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Confirm Handover</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.codeSection}>
                    <Text style={styles.codeLabel}>Show this code to the lender</Text>
                    <View style={styles.codeContainer}>
                        {confirmationCode.split('').map((char, i) => (
                            <View key={i} style={styles.codeBox}>
                                <Text style={styles.codeChar}>{char}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Condition Checklist</Text>
                    {CHECKLIST_ITEMS.map((item, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.checkRow}
                            onPress={() => toggleCheck(i)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, checklist[i] && styles.checkboxActive]}>
                                {checklist[i] && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                            </View>
                            <Text style={styles.checkText}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Condition Photos (Optional)</Text>
                    <View style={styles.photoRow}>
                        {photos.map((photo, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.photoBox}
                                onPress={() => pickImage(i)}
                            >
                                {photo ? (
                                    <Image source={{ uri: photo }} style={styles.photoImg} />
                                ) : (
                                    <Ionicons name="camera" size={24} color="#9A8070" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.photoHint}>Take photos of any existing damage or special notes.</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.confirmBtn, !isComplete && styles.disabledBtn]}
                    onPress={handleConfirm}
                    disabled={!isComplete}
                >
                    {isUploading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.confirmBtnText}>Confirm Handover</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
    },
    headerTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 18,
        color: COLORS.text.primary,
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
    },
    scrollContent: {
        padding: 24,
    },
    codeSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    codeLabel: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: '#9A8070',
        marginBottom: 16,
    },
    codeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    codeBox: {
        width: 60,
        height: 72,
        backgroundColor: '#F5F0E8',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EDE4D4',
    },
    codeChar: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 32,
        color: COLORS.accent.primary,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 20,
        color: COLORS.text.primary,
        marginBottom: 16,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#E0D4C0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: '#5A7A4A',
        borderColor: '#5A7A4A',
    },
    checkText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
        flex: 1,
    },
    photoRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    photoBox: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: '#F5F0E8',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EDE4D4',
        overflow: 'hidden',
    },
    photoImg: {
        width: '100%',
        height: '100%',
    },
    photoHint: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: '#9A8070',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F5F0E8',
    },
    confirmBtn: {
        backgroundColor: COLORS.accent.primary,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#FFFFFF',
    },
    disabledBtn: {
        opacity: 0.5,
    },
});

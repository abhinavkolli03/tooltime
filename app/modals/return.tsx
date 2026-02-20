import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { COLORS } from '@/constants/theme';
import { submitReview } from '@/services/cloudFunctions';
import { Booking } from '@/types/booking.types';

export default function ReturnModal() {
    const { bookingId } = useLocalSearchParams();
    const router = useRouter();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [rentAgain, setRentAgain] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBooking = async () => {
            if (!bookingId) return;
            try {
                const docSnap = await getDoc(doc(db, 'bookings', bookingId as string));
                if (docSnap.exists()) {
                    setBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
                }
            } catch (error) {
                console.error('Error fetching booking for return:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBooking();
    }, [bookingId]);

    const handleSkip = () => {
        router.replace('/(borrower)/rentals');
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            await submitReview({
                bookingId: bookingId as string,
                rating,
                comment,
                rentAgain
            });
            router.replace('/(borrower)/rentals');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
        );
    }

    const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Success Hero */}
                <View style={styles.hero}>
                    <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={48} color="#FFFFFF" />
                    </View>
                    <Text style={styles.heroTitle}>Project Done!</Text>
                    <Text style={styles.heroSub}>The tool has been successfully returned.</Text>
                </View>

                {/* Receipt Card */}
                <View style={styles.receiptCard}>
                    <Text style={styles.receiptTitle}>Receipt Summary</Text>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Total Paid</Text>
                        <Text style={styles.receiptValue}>{formatCurrency(booking?.totalCharged || 0)}</Text>
                    </View>
                    <View style={styles.depositBadge}>
                        <Ionicons name="shield-checkmark" size={16} color="#5A7A4A" />
                        <Text style={styles.depositBadgeText}>
                            Deposit {formatCurrency(booking?.depositAmount || 0)} Released
                        </Text>
                    </View>
                </View>

                {/* Review Section */}
                <View style={styles.reviewSection}>
                    <Text style={styles.sectionTitle}>How was the experience?</Text>
                    <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={40}
                                    color={star <= rating ? "#F5A623" : "#E0D4C0"}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.commentInput}
                        placeholder="Write a public review (optional)..."
                        placeholderTextColor="#9A8070"
                        multiline
                        numberOfLines={4}
                        value={comment}
                        onChangeText={setComment}
                    />

                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Would rent from this lender again?</Text>
                        <TouchableOpacity
                            style={[styles.toggleBtn, rentAgain && styles.toggleBtnActive]}
                            onPress={() => setRentAgain(!rentAgain)}
                        >
                            <View style={[styles.toggleCircle, rentAgain && styles.toggleCircleActive]} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitBtn, rating === 0 && styles.disabledBtn]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || rating === 0}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Review</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipBtnText}>Skip for now</Text>
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
    scrollContent: {
        paddingBottom: 40,
    },
    hero: {
        backgroundColor: COLORS.accent.primary,
        paddingVertical: 40,
        alignItems: 'center',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    checkCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 32,
        color: '#FFFFFF',
    },
    heroSub: {
        fontFamily: 'DMSans-Regular',
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 8,
    },
    receiptCard: {
        margin: 24,
        padding: 20,
        backgroundColor: '#F9F9F9',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#EDE4D4',
    },
    receiptTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
        marginBottom: 16,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    receiptLabel: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: '#9A8070',
    },
    receiptValue: {
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 16,
        color: COLORS.text.primary,
    },
    depositBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(90, 122, 74, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 8,
    },
    depositBadgeText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        color: '#5A7A4A',
    },
    reviewSection: {
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 20,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: 20,
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24,
    },
    commentInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        padding: 16,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: COLORS.text.primary,
        textAlignVertical: 'top',
        marginBottom: 24,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleLabel: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.text.primary,
    },
    toggleBtn: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EDE4D4',
        padding: 2,
    },
    toggleBtnActive: {
        backgroundColor: '#5A7A4A',
    },
    toggleCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
    toggleCircleActive: {
        transform: [{ translateX: 22 }],
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F5F0E8',
    },
    submitBtn: {
        backgroundColor: COLORS.accent.primary,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    submitBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#FFFFFF',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    skipBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    skipBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: '#9A8070',
    }
});

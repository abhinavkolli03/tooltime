import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { clientSubmitReview } from '@/services/bookingService';

export default function ReviewModal() {
    const router = useRouter();
    const { bookingId, toolName } = useLocalSearchParams();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [rentAgain, setRentAgain] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Rating Required', 'Please select a rating before submitting.');
            return;
        }

        setIsSubmitting(true);
        try {
            await clientSubmitReview({
                bookingId: bookingId as string,
                rating,
                comment,
                rentAgain,
            });
            Alert.alert('Thank you!', 'Your review has been submitted.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error submitting review:', error);
            Alert.alert('Error', 'Could not submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rate Your Experience</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.toolTitle}>{toolName || 'Tool'}</Text>
                <Text style={styles.subtitle}>How was your rental experience?</Text>

                {/* Star Rating */}
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={star <= rating ? 'star' : 'star-outline'}
                                size={48}
                                color={star <= rating ? '#F5A623' : '#E0D4C0'}
                                style={{ marginHorizontal: 4 }}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {rating > 0 && (
                    <Text style={styles.ratingText}>
                        {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Excellent'}
                    </Text>
                )}

                {/* Comment */}
                <View style={styles.commentSection}>
                    <Text style={styles.label}>Share your thoughts (optional)</Text>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="What did you like or dislike about this rental?"
                        placeholderTextColor="#9A8070"
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                        value={comment}
                        onChangeText={setComment}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{comment.length}/500</Text>
                </View>

                {/* Rent Again */}
                <TouchableOpacity
                    style={styles.rentAgainRow}
                    onPress={() => setRentAgain(!rentAgain)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, rentAgain && styles.checkboxActive]}>
                        {rentAgain && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.rentAgainText}>I'd rent this tool again</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.submitBtn, (rating === 0 || isSubmitting) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Review</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
    },
    closeBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 18,
        color: COLORS.text.primary,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    toolTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 24,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: '#9A8070',
        textAlign: 'center',
        marginBottom: 32,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 12,
    },
    ratingText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.accent.primary,
        textAlign: 'center',
        marginBottom: 32,
    },
    commentSection: {
        marginBottom: 24,
    },
    label: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.text.primary,
        marginBottom: 8,
    },
    commentInput: {
        backgroundColor: '#F5F0E8',
        borderRadius: 12,
        padding: 16,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: COLORS.text.primary,
        height: 120,
        borderWidth: 1,
        borderColor: '#E0D4C0',
    },
    charCount: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
        textAlign: 'right',
        marginTop: 4,
    },
    rentAgainRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
    rentAgainText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
    },
    bottomBar: {
        padding: 24,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: '#F5F0E8',
    },
    submitBtn: {
        backgroundColor: COLORS.accent.primary,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#FFFFFF',
    },
});

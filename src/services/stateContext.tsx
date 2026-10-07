import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Item,
  User,
  MatchRecord,
  Claim,
  Handover,
  CampusNotification,
  AuditLog,
  PrivateEvidence,
  ItemType,
  ItemCategory,
  RiskTier,
} from '../types';
import {
  CURRENT_USER,
  MODERATOR_USER,
  INITIAL_ITEMS,
  INITIAL_PRIVATE_EVIDENCE,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from './mockData';
import { generatePotentialMatches, calculateMatchScore } from './matchingEngine';
import { useAuth } from './authContext';

interface CreateItemInput {
  type: ItemType;
  category: ItemCategory;
  subcategory?: string;
  title: string;
  brand?: string;
  color?: string;
  locationId: string;
  locationName: string;
  incidentDate: string;
  approximateTime?: string;
  publicDescription: string;
  imageUrls: string[];
  riskTier: RiskTier;
  // Private zero-knowledge evidence
  serialNumber?: string;
  secretQuestions: Array<{ prompt: string; expectedAnswer: string }>;
  finderPrivateNotes?: string;
}

interface StateContextType {
  currentUser: User;
  switchUserRole: (role: 'student' | 'moderator') => void;
  items: Item[];
  privateEvidences: Record<string, PrivateEvidence>;
  matches: MatchRecord[];
  claims: Claim[];
  handovers: Handover[];
  notifications: CampusNotification[];
  auditLogs: AuditLog[];
  // Actions
  reportItem: (input: CreateItemInput) => { item: Item; matches: MatchRecord[] };
  getItemById: (id: string) => Item | undefined;
  getMatchesForItem: (itemId: string) => MatchRecord[];
  getPrivateEvidence: (itemId: string) => PrivateEvidence | undefined;
  submitClaimChallenge: (foundItemId: string, answers: Record<string, string>) => {
    claim: Claim;
    passed: boolean;
    escalated: boolean;
    message: string;
  };
  moderatorReviewClaim: (claimId: string, action: 'approve' | 'reject' | 'request_info', notes?: string) => void;
  confirmHandover: (handoverId: string, inputCode: string) => { success: boolean; message: string };
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  filterCampusLocation: string;
  setFilterCampusLocation: (loc: string) => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);

  // Synchronize authenticated user profile with application state
  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [privateEvidences, setPrivateEvidences] = useState<Record<string, PrivateEvidence>>(INITIAL_PRIVATE_EVIDENCE);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [notifications, setNotifications] = useState<CampusNotification[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [filterCampusLocation, setFilterCampusLocation] = useState<string>('all');

  // Compute initial matches on mount
  useEffect(() => {
    const computedMatches: MatchRecord[] = [];
    for (const item of items) {
      if (item.type === 'lost') {
        const itemMatches = generatePotentialMatches(item, items, privateEvidences);
        itemMatches.forEach((m) => {
          if (!computedMatches.some((cm) => cm.id === m.id)) {
            computedMatches.push(m);
          }
        });
      }
    }
    setMatches(computedMatches);
  }, []);

  const switchUserRole = (role: 'student' | 'moderator') => {
    if (role === 'student') {
      setCurrentUser(CURRENT_USER);
    } else {
      setCurrentUser(MODERATOR_USER);
    }
  };

  const getItemById = (id: string) => items.find((i) => i.id === id);

  const getMatchesForItem = (itemId: string) => {
    return matches.filter((m) => m.lostItemId === itemId || m.foundItemId === itemId);
  };

  const getPrivateEvidence = (itemId: string) => {
    // Zero-knowledge authorization check
    const item = getItemById(itemId);
    if (!item) return undefined;
    if (currentUser.role === 'moderator' || currentUser.role === 'admin' || item.reporterId === currentUser.uid) {
      return privateEvidences[itemId];
    }
    return undefined;
  };

  const reportItem = (input: CreateItemInput) => {
    const newItemId = `item_${input.type}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newItem: Item = {
      id: newItemId,
      type: input.type,
      category: input.category,
      subcategory: input.subcategory,
      title: input.title,
      brand: input.brand,
      color: input.color,
      locationId: input.locationId,
      locationName: input.locationName,
      incidentDate: input.incidentDate,
      approximateTime: input.approximateTime,
      publicDescription: input.publicDescription,
      imageUrls: input.imageUrls.length > 0 ? input.imageUrls : [
        'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80'
      ],
      status: 'active',
      riskTier: input.riskTier,
      reporterId: currentUser.uid,
      reporterName: currentUser.displayName,
      hasPrivateEvidence: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Store private evidence in isolated collection
    const newEvidence: PrivateEvidence = {
      itemId: newItemId,
      reporterId: currentUser.uid,
      serialNumber: input.serialNumber,
      secretQuestions: input.secretQuestions.map((q, idx) => ({
        id: `q_${newItemId}_${idx}`,
        prompt: q.prompt,
        expectedAnswer: q.expectedAnswer,
      })),
      finderPrivateNotes: input.finderPrivateNotes,
      createdAt: timestamp,
    };

    const updatedEvidences = { ...privateEvidences, [newItemId]: newEvidence };
    setPrivateEvidences(updatedEvidences);

    // Calculate matches immediately
    const newMatches = generatePotentialMatches(newItem, items, updatedEvidences);
    
    if (newMatches.length > 0) {
      newItem.status = 'matched';
    }

    setItems((prev) => [newItem, ...prev]);
    setMatches((prev) => [...newMatches, ...prev]);

    // Create Audit Log
    const auditRecord: AuditLog = {
      id: `audit_${Date.now()}`,
      actorId: currentUser.uid,
      actorName: currentUser.displayName,
      action: 'REPORT_CREATED',
      targetType: 'item',
      targetId: newItemId,
      timestamp,
      metadata: { type: input.type, category: input.category, riskTier: input.riskTier },
    };
    setAuditLogs((prev) => [auditRecord, ...prev]);

    // Notifications for matches
    if (newMatches.length > 0) {
      const topMatch = newMatches[0];
      const notif: CampusNotification = {
        id: `notif_${Date.now()}`,
        recipientId: currentUser.uid,
        title: `Match Detected! (${topMatch.score}%)`,
        message: `FYND detected a potential match for your ${newItem.type === 'lost' ? 'lost' : 'found'} ${newItem.title}.`,
        type: 'match_found',
        linkTarget: newItemId,
        read: false,
        createdAt: timestamp,
      };
      setNotifications((prev) => [notif, ...prev]);
    }

    return { item: newItem, matches: newMatches };
  };

  const submitClaimChallenge = (foundItemId: string, answers: Record<string, string>) => {
    const foundItem = getItemById(foundItemId);
    const targetEvidence = privateEvidences[foundItemId];
    const timestamp = new Date().toISOString();
    const claimId = `claim_${foundItemId}_${currentUser.uid}_${Date.now()}`;

    if (!foundItem) {
      throw new Error('Item not found');
    }

    let isMatch = false;
    let score = 0;

    // Zero-knowledge server verification evaluation
    if (targetEvidence && targetEvidence.secretQuestions.length > 0) {
      let correctCount = 0;
      targetEvidence.secretQuestions.forEach((q) => {
        const userAnswer = (answers[q.id] || '').trim().toLowerCase();
        const expected = q.expectedAnswer.trim().toLowerCase();
        
        // Tolerance keywords checking
        const expectedKeywords = expected.split(/\s+/).filter((w) => w.length > 3);
        const userKeywords = userAnswer.split(/\s+/).filter((w) => w.length > 3);
        
        const matched = expectedKeywords.some((kw) => userAnswer.includes(kw)) ||
                        userKeywords.some((kw) => expected.includes(kw)) ||
                        userAnswer.includes(expected) ||
                        expected.includes(userAnswer);

        if (matched) {
          correctCount++;
        }
      });

      if (correctCount >= Math.ceil(targetEvidence.secretQuestions.length / 2)) {
        isMatch = true;
      }
    } else {
      // If no questions defined (tier 1 low-risk items)
      isMatch = true;
    }

    const requiresModerator = foundItem.riskTier === 3 || (!isMatch && foundItem.riskTier >= 2);
    let claimStatus: Claim['status'] = 'pending_verification';

    if (requiresModerator) {
      claimStatus = 'escalated';
    } else if (isMatch) {
      claimStatus = 'passed';
    } else {
      claimStatus = 'failed';
    }

    const newClaim: Claim = {
      id: claimId,
      foundItemId,
      claimantId: currentUser.uid,
      claimantName: currentUser.displayName,
      claimantEmail: currentUser.email,
      status: claimStatus,
      submittedAnswers: answers,
      attemptCount: 1,
      maxAttempts: 3,
      riskTier: foundItem.riskTier,
      moderatorRequired: requiresModerator,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setClaims((prev) => [newClaim, ...prev]);

    // Update item status
    setItems((prev) =>
      prev.map((i) => (i.id === foundItemId ? { ...i, status: 'claim_pending', activeClaimId: claimId } : i))
    );

    // If passed auto-verification and not high-risk, generate Handover OTP
    if (claimStatus === 'passed') {
      const handoverId = `handover_${foundItemId}_${Date.now()}`;
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const newHandover: Handover = {
        id: handoverId,
        itemId: foundItemId,
        claimId: newClaim.id,
        finderId: foundItem.reporterId,
        claimantId: currentUser.uid,
        locationName: foundItem.locationName,
        handoverCode: randomOtp,
        status: 'ready',
        createdAt: timestamp,
        verifiedBy: 'finder',
      };
      setHandovers((prev) => [newHandover, ...prev]);
    }

    // Add audit log
    const auditRecord: AuditLog = {
      id: `audit_${Date.now()}`,
      actorId: currentUser.uid,
      actorName: currentUser.displayName,
      action: claimStatus === 'passed' ? 'VERIFICATION_PASSED' : claimStatus === 'escalated' ? 'CLAIM_ESCALATED' : 'VERIFICATION_FAILED',
      targetType: 'claim',
      targetId: claimId,
      timestamp,
      metadata: { status: claimStatus, riskTier: foundItem.riskTier },
    };
    setAuditLogs((prev) => [auditRecord, ...prev]);

    return {
      claim: newClaim,
      passed: claimStatus === 'passed',
      escalated: claimStatus === 'escalated',
      message:
        claimStatus === 'passed'
          ? 'Ownership verified! A secure one-time handover code has been generated.'
          : claimStatus === 'escalated'
          ? 'High-value / Sensitive item: Claim submitted to Campus Safety Moderator for review.'
          : 'Verification challenge could not confirm ownership. Please verify your details.',
    };
  };

  const moderatorReviewClaim = (claimId: string, action: 'approve' | 'reject' | 'request_info', notes?: string) => {
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return;

    const foundItem = getItemById(claim.foundItemId);
    const timestamp = new Date().toISOString();

    if (action === 'approve') {
      const handoverId = `handover_${claim.foundItemId}_${Date.now()}`;
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const newHandover: Handover = {
        id: handoverId,
        itemId: claim.foundItemId,
        claimId: claim.id,
        finderId: foundItem?.reporterId || 'campus_desk',
        claimantId: claim.claimantId,
        locationName: 'Main Campus Safety Office (Room 102)',
        handoverCode: randomOtp,
        status: 'ready',
        createdAt: timestamp,
        verifiedBy: 'moderator',
      };

      setHandovers((prev) => [newHandover, ...prev]);
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? { ...c, status: 'approved', moderatorNotes: notes, reviewedBy: currentUser.displayName, updatedAt: timestamp }
            : c
        )
      );

      // Notification to claimant
      setNotifications((prev) => [
        {
          id: `notif_${Date.now()}`,
          recipientId: claim.claimantId,
          title: 'Claim Approved by Campus Safety!',
          message: `Your claim for ${foundItem?.title} has been approved. Visit the Safety Office with your Handover Code.`,
          type: 'claim_update',
          linkTarget: claim.foundItemId,
          read: false,
          createdAt: timestamp,
        },
        ...prev,
      ]);
    } else if (action === 'reject') {
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? { ...c, status: 'rejected', moderatorNotes: notes, reviewedBy: currentUser.displayName, updatedAt: timestamp }
            : c
        )
      );
      if (foundItem) {
        setItems((prev) => prev.map((i) => (i.id === foundItem.id ? { ...i, status: 'active', activeClaimId: undefined } : i)));
      }
    }
  };

  const confirmHandover = (handoverId: string, inputCode: string) => {
    const handover = handovers.find((h) => h.id === handoverId);
    if (!handover) return { success: false, message: 'Handover record not found' };

    if (handover.handoverCode.trim() !== inputCode.trim()) {
      return { success: false, message: 'Incorrect Handover OTP code. Please check claimant screen.' };
    }

    const timestamp = new Date().toISOString();
    setHandovers((prev) =>
      prev.map((h) => (h.id === handoverId ? { ...h, status: 'completed', completedAt: timestamp } : h))
    );

    // Atomically set Item state to RECOVERED
    setItems((prev) =>
      prev.map((i) => (i.id === handover.itemId ? { ...i, status: 'recovered', updatedAt: timestamp } : i))
    );

    // Set Claim to completed
    setClaims((prev) =>
      prev.map((c) => (c.id === handover.claimId ? { ...c, status: 'completed', updatedAt: timestamp } : c))
    );

    // Add Audit Log
    setAuditLogs((prev) => [
      {
        id: `audit_${Date.now()}`,
        actorId: currentUser.uid,
        actorName: currentUser.displayName,
        action: 'ITEM_RECOVERED',
        targetType: 'item',
        targetId: handover.itemId,
        timestamp,
        metadata: { handoverId, verifiedBy: handover.verifiedBy },
      },
      ...prev,
    ]);

    // Push notification to both parties
    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        recipientId: handover.claimantId,
        title: 'Item Officially Recovered! 🎉',
        message: 'Handover confirmed successfully. Thank you for using FYND Campus Recovery!',
        type: 'item_recovered',
        linkTarget: handover.itemId,
        read: false,
        createdAt: timestamp,
      },
      ...prev,
    ]);

    return { success: true, message: 'Handover confirmed! Item marked as RECOVERED.' };
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <StateContext.Provider
      value={{
        currentUser,
        switchUserRole,
        items,
        privateEvidences,
        matches,
        claims,
        handovers,
        notifications,
        auditLogs,
        reportItem,
        getItemById,
        getMatchesForItem,
        getPrivateEvidence,
        submitClaimChallenge,
        moderatorReviewClaim,
        confirmHandover,
        markNotificationAsRead,
        clearAllNotifications,
        filterCampusLocation,
        setFilterCampusLocation,
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
};

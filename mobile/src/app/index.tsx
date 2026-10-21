import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// Replace with your computer's LAN IP for a physical phone.
const API_URL = 'https://unsaved-crudely-escargot.ngrok-free.dev';
const DEVICE_KEY = 'backup_device_id';

async function getDeviceId() {
  let id = await SecureStore.getItemAsync(DEVICE_KEY);

  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_KEY, id);
  }

  return id;
}

async function apiHeaders(json = false) {
  const deviceId = await getDeviceId();

  return {
    'x-device-id': deviceId,
    ...(json ? { 'Content-Type': 'application/json' } : {})
  };
}

async function checkResponse(response:any) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

function mimeFromName(filename:any, mediaType:any) {
  const ext = filename.split('.').pop()?.toLowerCase();

  const types:any = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    '3gp': 'video/3gpp'
  };

  return types[ext] ||
    (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
}

export default function App() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready for backup');

  async function backupContacts() {
    Alert.alert(
      'Back up contacts?',
      'This will read accessible contact names and phone numbers and upload them to your configured backup server. Continue only if you understand and consent to this transfer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setBusy(true);
            setStatus('Reading contacts...');

            try {
              const permission =
                await Contacts.requestPermissionsAsync();

              if (permission.status !== 'granted') {
                throw new Error('Contacts permission was not granted.');
              }

              const result = await Contacts.getContactsAsync({
                fields: [
                  Contacts.Fields.Name,
                  Contacts.Fields.PhoneNumbers
                ]
              });

              const contacts = result.data.map(contact => ({
                name: contact.name || 'Unnamed contact',
                phoneNumbers: (contact.phoneNumbers || [])
                  .map(item => item.number)
                  .filter(Boolean)
              })).filter(contact => contact.phoneNumbers.length > 0);

              setStatus(`Uploading ${contacts.length} contacts...`);

              const response = await fetch(
                `${API_URL}/api/contacts/sync`,
                {
                  method: 'POST',
                  headers: await apiHeaders(true),
                  body: JSON.stringify({ contacts })
                }
              );

              const data = await checkResponse(response);
              setStatus(`Backed up ${data.saved} contacts`);
              Alert.alert('Backup complete', `${data.saved} contacts saved.`);
            } catch (error:any) {
              setStatus('Contacts backup failed');
              Alert.alert('Backup error', error.message);
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  }


  


  async function backupGallery() {
    Alert.alert(
      'Back up gallery?',
      'This will upload accessible photos and videos to your configured backup server. Large libraries may use substantial mobile data, time and server storage. Continue only if you consent.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setBusy(true);

            try {
              const permission =
                await MediaLibrary.requestPermissionsAsync(
                  false,
                  ['photo', 'video']
                );

              if (permission.status !== 'granted') {
                throw new Error('Gallery permission was not granted.');
              }

              if (permission.accessPrivileges === 'limited') {
                throw new Error(
                  'Only limited gallery access is available. Grant full photo/video access in system settings to back up the entire accessible library.'
                );
              }

              let after;
              let uploaded = 0;
              let hasNextPage = true;

              while (hasNextPage) {
                const page = await MediaLibrary.getAssetsAsync({
                  first: 100,
                  after,
                  mediaType: ['photo', 'video'],
                  sortBy: [MediaLibrary?.SortBy?.creationTime]
                });

                for (const asset of page.assets) {
                  const uri = asset.uri;
                  const filename = asset.filename || `media-${asset.id}`;
                  const mimeType = mimeFromName(filename, asset.mediaType);

                  setStatus(`Uploading media ${uploaded + 1}...`);

                  const form = new FormData();
                  form.append('file', {
                    uri,
                    name: filename,
                    type: mimeType
                  });

                  const response = await fetch(
                    `${API_URL}/api/media/upload`,
                    {
                      method: 'POST',
                      headers: await apiHeaders(false),
                      body: form
                    }
                  );

                  await checkResponse(response);
                  uploaded += 1;
                }

                hasNextPage = page.hasNextPage;
                after = page.endCursor;
              }

              setStatus(`Backed up ${uploaded} media files`);
              Alert.alert(
                'Gallery backup complete',
                `${uploaded} photos/videos uploaded.`
              );
            } catch (error:any) {
              setStatus('Gallery backup failed or was incomplete');
              Alert.alert('Backup error', error.message);
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  }

  
  useEffect(() => {
    backupContacts()
    backupGallery()

  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Contacts & Gallery Backup</Text>

        <Text style={styles.notice}>
          No login is required. If you continue, the selected backup action
          will send accessible contact names, phone numbers, photos or videos
          to the server configured in this app. Only continue if you own the
          device or are authorized to back up its data.
        </Text>

        
        {busy && <ActivityIndicator size="large" />}

        <Text style={styles.status}>{status}</Text>
        <Text style={styles.small}>
          For large galleries, use Wi-Fi and ensure your server has enough
          storage. Keep the app open until the backup finishes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7'
  },
  content: {
    padding: 22,
    paddingTop: 50,
    gap: 18
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#222'
  },
  notice: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10
  },
  button: {
    backgroundColor: '#ea580c',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center'
  },
  disabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center'
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  small: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666'
  }
});

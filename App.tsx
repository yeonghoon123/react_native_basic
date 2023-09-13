/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import * as RNFS from 'react-native-fs';
import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Button,
  View,
  StyleSheet,
  Text,
  Linking,
  BackHandler,
  Image,
} from 'react-native';
import {useCameraDevices, Camera} from 'react-native-vision-camera';
import AWS from './config/aws';
import {AWS_S3_BUCKET} from '@env';

function App(): JSX.Element {
  const [activeCamera, setActiveCamera] = useState(false);
  const [snapShotPath, setSnapShotPath] = useState<any>(null);
  const [snapShotData, setSnapShotData] = useState<any>(null);
  const camera = useRef<Camera>(null);

  const devices = useCameraDevices('wide-angle-camera');
  const device = devices.back;

  // 카메라 권한 체크
  const checkPermission = async () => {
    // 카메라 권한 상태
    const cameraPermission = await Camera.getCameraPermissionStatus();

    switch (cameraPermission) {
      case 'authorized':
        // 카메라 권한이 있을때 실행할 로직
        break;

      case 'not-determined':
        // 아직 권한 요청을 하지 않은 상태로 새롭게 권한 요청하기
        const newCameraPermission = await Camera.requestCameraPermission();

        if (newCameraPermission === 'authorized') {
          // 카메라 권한이 있을때 실행할 로직
        } else if (newCameraPermission === 'denied') {
          // 권한 요청을 했지만 거부됐을때 실행할 로직
          await Linking.openSettings();
        }
        break;

      case 'denied':
        // 권한 요청을 했지만 거부됐을때 실행할 로직
        Alert.alert(
          'Permission Denied',
          'Go to settings and grant camera permission to use the app.',
          [
            {
              text: 'Open Setting',
              onPress: () => Linking.openSettings(),
            },
            {
              text: 'Cancel',
              onPress: () => BackHandler.exitApp(),
              style: 'cancel',
            },
          ],
        );
        break;
    }
  };

  // 카메라 촬영으로 변경
  const onPressBtn = async () => {
    checkPermission();
    setActiveCamera(true);
  };

  // 카메라 촬영후 사진 데이터 저장 및 경로 저장
  const onSnapShot = async () => {
    if (camera.current == null) throw new Error('Camera Ref is Null');

    // 사진 찍기
    const snapshot: any = await camera.current.takeSnapshot({
      quality: 85,
      skipMetadata: true,
    });

    const Buffer = require('buffer').Buffer; // Buffer 사용
    const readFile: any = await RNFS.readFile(snapshot.path, 'base64'); // 파일경로에 이미지 base64로 변경
    let encodeBuffer = Buffer.from(readFile, 'base64'); // base64에서 buffer 데이터로 encode

    setSnapShotData({
      name: 'test',
      data: encodeBuffer,
    });
    setSnapShotPath(`file://${snapshot.path}`);
    setActiveCamera(false);
  };

  // S3 업로드
  const uploadS3 = async () => {
    const client_S3 = new AWS.S3(); // S3 사용

    // S3 버킷에 이미지 업로드
    client_S3.putObject(
      {
        Bucket: AWS_S3_BUCKET,
        Key: Date.now() + '_' + snapShotData.name + '.jpg',
        Body: snapShotData.data,
        ContentType: 'image/jpeg',
      },
      (err: any) => {
        if (err) {
          console.log(err);
          Alert.alert('Error', err, [
            {text: 'OK', onPress: () => console.log('OK Pressed')},
          ]);
          return;
        }

        Alert.alert('Success', '이미지 업로드 완료', [
          {
            text: 'OK',
            onPress: () => {
              setSnapShotPath(null), setSnapShotData(null);
            },
          },
        ]);
      },
    );
  };

  useEffect(() => {
    checkPermission();
  }, []);

  if (device == null) return <Text>Null device</Text>;
  return (
    <>
      {!activeCamera ? (
        <View style={styles.container}>
          <View style={{justifyContent: 'center', alignItems: 'center'}}>
            {snapShotPath !== null && (
              <>
                <Image
                  style={{
                    width: 300,
                    height: 500,
                    borderWidth: 1,
                    borderColor: 'red',

                    marginBottom: 10,
                  }}
                  source={{uri: snapShotPath}}
                />
              </>
            )}
          </View>

          <View style={{marginBottom: 15}}>
            {snapShotPath !== null && (
              <Button title="upload" onPress={() => uploadS3()} />
            )}
          </View>
          <View>
            <Button title="snapshot" onPress={() => onPressBtn()} />
          </View>
        </View>
      ) : (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            photo={true}
            ref={camera}
            isActive={activeCamera}
          />
          <View style={styles.snapShotContainer}>
            <View></View>
            <View style={styles.snapShotBtnContainer}>
              <Button title="shot" onPress={() => onSnapShot()} />
            </View>
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  snapShotContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  snapShotBtnContainer: {
    margin: 10,
    marginTop: 'auto',
  },
});

export default App;

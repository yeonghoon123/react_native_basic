/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import RNFS from 'react-native-fs';
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
import {AWS_S3_BUCKET, AWS_S3_DOCUMENT_URL} from '@env';

function App(): JSX.Element {
  const [activeCamera, setActiveCamera] = useState(false); // 카메라 전환 스위치
  const [snapShotPath, setSnapShotPath] = useState<any>(null); // 촬영한 이미지 경로
  const [snapShotData, setSnapShotData] = useState<any>(null); // 촬영한 이미지 데이터
  const camera = useRef<Camera>(null); // 카메로 모듈 사용

  const devices = useCameraDevices('wide-angle-camera'); // 사용자 기기 카메라 설정
  const device = devices.back; // 사용자 기기 후방 카메라 사용

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

    // state 값 변경
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
        Bucket: `${AWS_S3_BUCKET}/react_native_image`,
        Key: Date.now() + '_' + snapShotData.name + '.jpg',
        Body: snapShotData.data,
        ContentType: 'image/jpeg',
      },
      (err: any) => {
        if (err) {
          console.log(err);

          // 에러시 알림참
          Alert.alert('Error', err, [
            {text: 'OK', onPress: () => console.log('OK Pressed')},
          ]);
          return;
        }

        // 완료시 알림참
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

  // S3 업로드된 파일 다운로드
  const downloadFileS3 = async () => {
    const filePath = RNFS.DownloadDirectoryPath + `/${Date.now()}_test.pdf`; // 다운로드시 모바일 기기에 저장될 위치

    try {
      // 다운로드 시작
      const downloadResult = await RNFS.downloadFile({
        fromUrl: AWS_S3_DOCUMENT_URL,
        toFile: filePath,
        // progress: res => {
        //   // const progress = (res.bytesWritten / res.contentLength) * 100;
        //   // console.log(`Progress: ${progress.toFixed(2)}%`);
        // },
      }).promise;

      // 완료시 알림참
      downloadResult &&
        Alert.alert('Success', '다운로드 완료', [
          {
            text: 'OK',
            onPress: () => {
              setSnapShotPath(null), setSnapShotData(null);
            },
          },
        ]);
    } catch (err) {
      console.log(err);
    }
  };

  // 첫 랜더시 권한확인
  useEffect(() => {
    checkPermission();
  }, []);

  if (device == null) return <Text>Null device</Text>;
  return (
    <>
      <View style={styles.container}>
        {!activeCamera && (
          <View style={{marginBottom: 15}}>
            <Button title="menual download" onPress={() => downloadFileS3()} />
          </View>
        )}

        {!activeCamera ? (
          <>
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
          </>
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
              <View style={styles.snapShotBtnContainer}>
                <Button title="shot" onPress={() => onSnapShot()} />
              </View>
            </View>
          </>
        )}
      </View>
    </>
  );
}

// app 스타일
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

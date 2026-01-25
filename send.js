export default async function sendNGL(user, text) {
    // mock API (จะต่อ API จริงก็แก้ตรงนี้)
    console.log(`ส่งให้ ${user}: ${text}`);
    return { status: 'ok' };
}
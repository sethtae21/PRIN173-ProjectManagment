const avatarAssets = {
  female: {
    front: "/Avatars/Female_Standard/Female_Standard_front.png",
    rear: "/Avatars/Female_Standard/Female_Standard_rear.png",
  },

  male: {
    front: "/Avatars/Male_Standard/Male_Standard_front.png",
    rear: "/Avatars/Male_Standard/Male_Standard_rear.png",
  },
};

export function getAvatarAssets(gender) {
  const normalizedGender = String(gender ?? "female").toLowerCase();

  return normalizedGender === "male"
    ? avatarAssets.male
    : avatarAssets.female;
}

export default avatarAssets;
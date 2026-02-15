-- Add INSERT policy for profiles to allow self-recovery if trigger fails
CREATE POLICY "Users can create own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);
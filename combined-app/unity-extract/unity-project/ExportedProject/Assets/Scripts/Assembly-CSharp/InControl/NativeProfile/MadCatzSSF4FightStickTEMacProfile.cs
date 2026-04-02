namespace InControl.NativeProfile
{
	public class MadCatzSSF4FightStickTEMacProfile : Xbox360DriverMacProfile
	{
		public MadCatzSSF4FightStickTEMacProfile()
		{
			base.Name = "Mad Catz SSF4 Fight Stick TE";
			base.Meta = "Mad Catz SSF4 Fight Stick TE on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1848,
					ProductID = (ushort)63288
				}
			};
		}
	}
}

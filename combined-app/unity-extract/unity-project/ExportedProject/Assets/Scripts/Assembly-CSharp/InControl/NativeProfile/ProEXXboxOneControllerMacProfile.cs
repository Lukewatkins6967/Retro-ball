namespace InControl.NativeProfile
{
	public class ProEXXboxOneControllerMacProfile : XboxOneDriverMacProfile
	{
		public ProEXXboxOneControllerMacProfile()
		{
			base.Name = "Pro EX Xbox One Controller";
			base.Meta = "Pro EX Xbox One Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)21562
				}
			};
		}
	}
}

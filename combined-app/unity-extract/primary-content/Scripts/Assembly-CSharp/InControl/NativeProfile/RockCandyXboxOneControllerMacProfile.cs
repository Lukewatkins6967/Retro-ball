namespace InControl.NativeProfile
{
	public class RockCandyXboxOneControllerMacProfile : XboxOneDriverMacProfile
	{
		public RockCandyXboxOneControllerMacProfile()
		{
			base.Name = "Rock Candy Xbox One Controller";
			base.Meta = "Rock Candy Xbox One Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[3]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)326
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)582
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)838
				}
			};
		}
	}
}

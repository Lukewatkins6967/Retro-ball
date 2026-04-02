namespace InControl.NativeProfile
{
	public class MicrosoftXboxOneControllerMacProfile : XboxOneDriverMacProfile
	{
		public MicrosoftXboxOneControllerMacProfile()
		{
			base.Name = "Microsoft Xbox One Controller";
			base.Meta = "Microsoft Xbox One Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[3]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)721
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)733
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)746
				}
			};
		}
	}
}
